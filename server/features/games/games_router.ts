import { Router, Request, Response } from 'express';
import { GamesRepository } from './games_repository.ts';
import { JsonStructureParser } from './json_structure_parser.ts';
import { JsonSchemaDetector } from './json_schema_detector.ts';
import { TranslationsRepository } from '../translations/translations_repository.ts';
import { GlossaryRepository } from '../glossary/glossary_repository.ts';
import { JsonSchemaConfig, Game } from '../../types/domain_types.ts';

export const gamesRouter = Router();

const formatGameWithStats = (g: Game) => {
  let parsedTags: string[] = [];
  try {
    if (g.whitelist_tags) {
      parsedTags = typeof g.whitelist_tags === 'string' ? JSON.parse(g.whitelist_tags) : g.whitelist_tags;
    }
  } catch {}

  return {
    ...g,
    whitelist_tags: parsedTags,
    totalKeys: GamesRepository.getBaseKeysCount(g.id),
    glossaryCount: GlossaryRepository.getByGame(g.id).length,
    languages: TranslationsRepository.getLanguages(g.id),
  };
};

// GET all games
gamesRouter.get('/', (req: Request, res: Response) => {
  try {
    const games = GamesRepository.getAll();
    const gamesWithStats = games.map(formatGameWithStats);
    res.json({ success: true, games: gamesWithStats });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET single game
gamesRouter.get('/:id', (req: Request, res: Response) => {
  try {
    const game = GamesRepository.getById(req.params.id);
    if (!game) {
      return res.status(404).json({ success: false, error: 'Game not found' });
    }
    res.json({ success: true, game: formatGameWithStats(game) });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST create game
gamesRouter.post('/', (req: Request, res: Response) => {
  try {
    const { name, description, context_prompt, base_language } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, error: 'Game name is required' });
    }
    const game = GamesRepository.create({ name, description, context_prompt, base_language });
    res.json({ success: true, game: formatGameWithStats(game) });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT update game
gamesRouter.put('/:id', (req: Request, res: Response) => {
  try {
    const { name, description, context_prompt, base_language, whitelist_tags } = req.body;
    const updated = GamesRepository.update(req.params.id, { name, description, context_prompt, base_language, whitelist_tags });
    if (!updated) {
      return res.status(404).json({ success: false, error: 'Game not found' });
    }
    res.json({ success: true, game: formatGameWithStats(updated) });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST discover & update tags from base keys
gamesRouter.post('/:id/discover-tags', (req: Request, res: Response) => {
  try {
    const game = GamesRepository.getById(req.params.id);
    if (!game) {
      return res.status(404).json({ success: false, error: 'Game not found' });
    }
    const tags = GamesRepository.discoverGameTags(req.params.id);
    res.json({
      success: true,
      tags,
      message: `Discovered and saved ${tags.length} unique tags from base keys`,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT update tag whitelist directly
gamesRouter.put('/:id/whitelist-tags', (req: Request, res: Response) => {
  try {
    const { tags } = req.body;
    if (!Array.isArray(tags)) {
      return res.status(400).json({ success: false, error: 'tags must be an array of strings' });
    }
    const updatedTags = GamesRepository.updateWhitelistTags(req.params.id, tags);
    res.json({ success: true, tags: updatedTags });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE game
gamesRouter.delete('/:id', (req: Request, res: Response) => {
  try {
    const success = GamesRepository.delete(req.params.id);
    res.json({ success });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST analyze raw JSON structure
gamesRouter.post('/:id/analyze-json', (req: Request, res: Response) => {
  try {
    const { jsonContent } = req.body;
    if (!jsonContent) {
      return res.status(400).json({ success: false, error: 'No JSON content provided' });
    }

    let parsed: any;
    if (typeof jsonContent === 'string') {
      try {
        parsed = JSON.parse(jsonContent);
      } catch (pErr: any) {
        return res.status(400).json({ success: false, error: `Invalid JSON syntax: ${pErr.message}` });
      }
    } else {
      parsed = jsonContent;
    }

    const analysis = JsonSchemaDetector.analyze(parsed);
    res.json({ success: true, analysis });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST import base reference JSON with optional custom schema
gamesRouter.post('/:id/import-json', (req: Request, res: Response) => {
  try {
    const { jsonContent, schemaConfig } = req.body as { jsonContent: any; schemaConfig?: JsonSchemaConfig };
    if (!jsonContent) {
      return res.status(400).json({ success: false, error: 'No JSON content provided' });
    }

    let parsed: any;
    let rawStr: string;

    if (typeof jsonContent === 'string') {
      rawStr = jsonContent;
      try {
        parsed = JSON.parse(jsonContent);
      } catch (pErr: any) {
        return res.status(400).json({ success: false, error: `Invalid JSON syntax: ${pErr.message}` });
      }
    } else {
      rawStr = JSON.stringify(jsonContent);
      parsed = jsonContent;
    }

    const flattened = JsonStructureParser.flattenWithConfig(parsed, schemaConfig);
    const schemaStr = schemaConfig ? JSON.stringify(schemaConfig) : '';
    const count = GamesRepository.importBaseKeys(req.params.id, flattened, rawStr, schemaStr);

    res.json({
      success: true,
      importedCount: count,
      message: `Successfully imported ${count} base reference keys`,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET export JSON for target language
gamesRouter.get('/:id/export-json/:languageCode', (req: Request, res: Response) => {
  try {
    const { id, languageCode } = req.params;
    const game = GamesRepository.getById(id);
    if (!game) {
      return res.status(404).json({ success: false, error: 'Game not found' });
    }

    const flatMap = TranslationsRepository.getExportMap(id, languageCode);
    const exportedJson = JsonStructureParser.unflattenWithTemplate(
      flatMap,
      game.raw_json_template,
      game.schema_config
    );

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="${game.name.toLowerCase().replace(/\s+/g, '_')}_${languageCode}.json"`);
    res.send(JSON.stringify(exportedJson, null, 2));
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});
