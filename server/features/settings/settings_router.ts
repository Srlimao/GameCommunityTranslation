import { Router, Response } from 'express';
import { SettingsRepository } from './settings_repository.ts';
import { AIService } from '../ai_providers/ai_service.ts';
import { AuthenticatedRequest } from '../auth/auth_middleware.ts';
import { AIProviderType } from '../../types/domain_types.ts';

export const settingsRouter = Router();

// GET settings (user-specific if authenticated, global system fallback otherwise)
settingsRouter.get('/', (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const settings = userId
      ? SettingsRepository.getUserSettings(userId)
      : SettingsRepository.getSettings();

    res.json({
      success: true,
      settings,
      is_user_specific: !!userId,
      user: req.user || null,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST update settings (updates user settings if logged in, or system defaults if admin scope requested)
settingsRouter.post('/', (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user;
    const payload = req.body.settings || req.body;
    const scope = req.body.scope || (user?.role === 'admin' && !req.body.user_only ? 'user' : 'user');

    let updated;
    if (user && scope === 'system' && user.role === 'admin') {
      updated = SettingsRepository.updateSettings(payload);
    } else if (user) {
      updated = SettingsRepository.updateUserSettings(user.id, payload);
    } else {
      updated = SettingsRepository.updateSettings(payload);
    }

    res.json({ success: true, settings: updated, scope });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST test generic AI provider
settingsRouter.post('/test-provider', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { provider, apiKey, baseUrl, model } = req.body as {
      provider: AIProviderType;
      apiKey?: string;
      baseUrl?: string;
      model?: string;
    };

    if (!provider) {
      return res.status(400).json({ success: false, message: 'Provider type is required', models: [] });
    }

    const result = await AIService.testProvider(provider, {
      apiKey,
      baseUrl,
      model,
    });

    res.json(result);
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message, models: [] });
  }
});

// Legacy backward-compatible test endpoint
settingsRouter.post('/test-lm-studio', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const settings = userId ? SettingsRepository.getUserSettings(userId) : SettingsRepository.getSettings();
    const result = await AIService.testProvider('openai_compatible', {
      baseUrl: req.body?.url || settings.translation_base_url,
      model: req.body?.model || settings.translation_model,
      apiKey: req.body?.apiKey || settings.translation_api_key,
    });
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message, models: [] });
  }
});
