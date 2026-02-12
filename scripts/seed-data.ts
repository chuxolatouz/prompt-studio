#!/usr/bin/env tsx

/**
 * Seed script to expand blocks.json and tools.json with more comprehensive data
 * Run with: npx tsx scripts/seed-data.ts
 */

import * as fs from 'fs';
import * as path from 'path';

const BLOCKS_PATH = path.join(__dirname, '../src/data/blocks.json');
const TOOLS_PATH = path.join(__dirname, '../src/data/tools.json');

// Expanded blocks covering more niches, structures, and columns
const expandedBlocks = [
    // Dev: Web
    { id: 'dev-web-1', titleKey: 'blocks.devWebRoleTitle', contentKey: 'blocks.devWebRoleContent', niche: 'dev:web', structure: 'RTF', level: 'basic', tags: ['dev', 'web'], image: '/chips/dev-web.svg', targetColumn: 'role' },
    { id: 'dev-web-2', titleKey: 'blocks.devWebGoalTitle', contentKey: 'blocks.devWebGoalContent', niche: 'dev:web', structure: 'TAO', level: 'intermediate', tags: ['dev', 'web'], image: '/chips/dev-web.svg', targetColumn: 'goal' },
    { id: 'dev-web-3', titleKey: 'blocks.devWebContextTitle', contentKey: 'blocks.devWebContextContent', niche: 'dev:web', structure: 'CARE', level: 'basic', tags: ['dev', 'web'], image: '/chips/dev-web.svg', targetColumn: 'context' },

    // Dev: Backend
    { id: 'dev-backend-1', titleKey: 'blocks.devBackendTitle', contentKey: 'blocks.devBackendContent', niche: 'dev:backend', structure: 'TAO', level: 'intermediate', tags: ['dev', 'backend'], image: '/chips/dev-backend.svg', targetColumn: 'goal' },
    { id: 'dev-backend-2', titleKey: 'blocks.devBackendConstraintsTitle', contentKey: 'blocks.devBackendConstraintsContent', niche: 'dev:backend', structure: 'RTF', level: 'intermediate', tags: ['dev', 'backend'], image: '/chips/dev-backend.svg', targetColumn: 'constraints' },
    { id: 'dev-backend-3', titleKey: 'blocks.devBackendExamplesTitle', contentKey: 'blocks.devBackendExamplesContent', niche: 'dev:backend', structure: 'CARE', level: 'advanced', tags: ['dev', 'backend'], image: '/chips/dev-backend.svg', targetColumn: 'examples' },

    // Dev: Mobile
    { id: 'dev-mobile-1', titleKey: 'blocks.devMobileRoleTitle', contentKey: 'blocks.devMobileRoleContent', niche: 'dev:mobile', structure: 'RTF', level: 'basic', tags: ['dev', 'mobile'], image: '/chips/dev-mobile.svg', targetColumn: 'role' },
    { id: 'dev-mobile-2', titleKey: 'blocks.devMobileGoalTitle', contentKey: 'blocks.devMobileGoalContent', niche: 'dev:mobile', structure: 'TAO', level: 'intermediate', tags: ['dev', 'mobile'], image: '/chips/dev-mobile.svg', targetColumn: 'goal' },

    // Dev: DevOps
    { id: 'dev-devops-1', titleKey: 'blocks.devDevOpsRoleTitle', contentKey: 'blocks.devDevOpsRoleContent', niche: 'dev:devops', structure: 'RTF', level: 'intermediate', tags: ['dev', 'devops'], image: '/chips/dev-devops.svg', targetColumn: 'role' },
    { id: 'dev-devops-2', titleKey: 'blocks.devDevOpsGoalTitle', contentKey: 'blocks.devDevOpsGoalContent', niche: 'dev:devops', structure: 'STAR', level: 'advanced', tags: ['dev', 'devops'], image: '/chips/dev-devops.svg', targetColumn: 'goal' },

    // Dev: Database
    { id: 'dev-db-1', titleKey: 'blocks.devDbRoleTitle', contentKey: 'blocks.devDbRoleContent', niche: 'dev:database', structure: 'RTF', level: 'intermediate', tags: ['dev', 'database'], image: '/chips/dev-db.svg', targetColumn: 'role' },
    { id: 'dev-db-2', titleKey: 'blocks.devDbOutputTitle', contentKey: 'blocks.devDbOutputContent', niche: 'dev:database', structure: 'TAO', level: 'intermediate', tags: ['dev', 'database'], image: '/chips/dev-db.svg', targetColumn: 'output-format' },

    // Dev: API
    { id: 'dev-api-1', titleKey: 'blocks.devApiRoleTitle', contentKey: 'blocks.devApiRoleContent', niche: 'dev:api', structure: 'RTF', level: 'basic', tags: ['dev', 'api'], image: '/chips/dev-api.svg', targetColumn: 'role' },
    { id: 'dev-api-2', titleKey: 'blocks.devApiConstraintsTitle', contentKey: 'blocks.devApiConstraintsContent', niche: 'dev:api', structure: 'CARE', level: 'intermediate', tags: ['dev', 'api'], image: '/chips/dev-api.svg', targetColumn: 'constraints' },

    // Images: Photo-real
    { id: 'image-photo-1', titleKey: 'blocks.imagePhotoTitle', contentKey: 'blocks.imagePhotoContent', niche: 'images:photo-real', structure: 'CO-STAR', level: 'basic', tags: ['images', 'photo'], image: '/chips/image-photo.svg', targetColumn: 'context' },
    { id: 'image-photo-2', titleKey: 'blocks.imagePhotoGoalTitle', contentKey: 'blocks.imagePhotoGoalContent', niche: 'images:photo-real', structure: 'CARE', level: 'intermediate', tags: ['images', 'photo'], image: '/chips/image-photo.svg', targetColumn: 'goal' },
    { id: 'image-photo-3', titleKey: 'blocks.imagePhotoConstraintsTitle', contentKey: 'blocks.imagePhotoConstraintsContent', niche: 'images:photo-real', structure: 'CO-STAR', level: 'advanced', tags: ['images', 'photo'], image: '/chips/image-photo.svg', targetColumn: 'constraints' },

    // Images: UI Mock
    { id: 'image-ui-1', titleKey: 'blocks.imageUiTitle', contentKey: 'blocks.imageUiContent', niche: 'images:ui-mock', structure: 'CARE', level: 'intermediate', tags: ['images', 'ui'], image: '/chips/image-ui.svg', targetColumn: 'examples' },
    { id: 'image-ui-2', titleKey: 'blocks.imageUiGoalTitle', contentKey: 'blocks.imageUiGoalContent', niche: 'images:ui-mock', structure: 'RTF', level: 'basic', tags: ['images', 'ui'], image: '/chips/image-ui.svg', targetColumn: 'goal' },

    // Images: Illustrations
    { id: 'image-illustration-1', titleKey: 'blocks.imageIllustrationRoleTitle', contentKey: 'blocks.imageIllustrationRoleContent', niche: 'images:illustration', structure: 'CO-STAR', level: 'basic', tags: ['images', 'illustration'], image: '/chips/image-illustration.svg', targetColumn: 'role' },
    { id: 'image-illustration-2', titleKey: 'blocks.imageIllustrationContextTitle', contentKey: 'blocks.imageIllustrationContextContent', niche: 'images:illustration', structure: 'CARE', level: 'intermediate', tags: ['images', 'illustration'], image: '/chips/image-illustration.svg', targetColumn: 'context' },

    // Images: Logos
    { id: 'image-logo-1', titleKey: 'blocks.imageLogoGoalTitle', contentKey: 'blocks.imageLogoGoalContent', niche: 'images:logo', structure: 'RTF', level: 'basic', tags: ['images', 'logo'], image: '/chips/image-logo.svg', targetColumn: 'goal' },
    { id: 'image-logo-2', titleKey: 'blocks.imageLogoConstraintsTitle', contentKey: 'blocks.imageLogoConstraintsContent', niche: 'images:logo', structure: 'CARE', level: 'intermediate', tags: ['images', 'logo'], image: '/chips/image-logo.svg', targetColumn: 'constraints' },

    // Videos: Cinematic
    { id: 'video-cinematic-1', titleKey: 'blocks.videoCinematicTitle', contentKey: 'blocks.videoCinematicContent', niche: 'videos:cinematic', structure: 'BAB', level: 'basic', tags: ['videos', 'cinematic'], image: '/chips/video-cinematic.svg', targetColumn: 'goal' },
    { id: 'video-cinematic-2', titleKey: 'blocks.videoCinematicContextTitle', contentKey: 'blocks.videoCinematicContextContent', niche: 'videos:cinematic', structure: 'STAR', level: 'intermediate', tags: ['videos', 'cinematic'], image: '/chips/video-cinematic.svg', targetColumn: 'context' },

    // Videos: Ads
    { id: 'video-ads-1', titleKey: 'blocks.videoAdsTitle', contentKey: 'blocks.videoAdsContent', niche: 'videos:ads', structure: 'STAR', level: 'intermediate', tags: ['videos', 'ads'], image: '/chips/video-ads.svg', targetColumn: 'output-format' },
    { id: 'video-ads-2', titleKey: 'blocks.videoAdsGoalTitle', contentKey: 'blocks.videoAdsGoalContent', niche: 'videos:ads', structure: 'BAB', level: 'basic', tags: ['videos', 'ads'], image: '/chips/video-ads.svg', targetColumn: 'goal' },

    // Videos: Tutorials
    { id: 'video-tutorial-1', titleKey: 'blocks.videoTutorialRoleTitle', contentKey: 'blocks.videoTutorialRoleContent', niche: 'videos:tutorial', structure: 'RTF', level: 'basic', tags: ['videos', 'tutorial'], image: '/chips/video-tutorial.svg', targetColumn: 'role' },
    { id: 'video-tutorial-2', titleKey: 'blocks.videoTutorialGoalTitle', contentKey: 'blocks.videoTutorialGoalContent', niche: 'videos:tutorial', structure: 'TAO', level: 'intermediate', tags: ['videos', 'tutorial'], image: '/chips/video-tutorial.svg', targetColumn: 'goal' },

    // Videos: Shorts
    { id: 'video-shorts-1', titleKey: 'blocks.videoShortsGoalTitle', contentKey: 'blocks.videoShortsGoalContent', niche: 'videos:shorts', structure: 'BAB', level: 'basic', tags: ['videos', 'shorts'], image: '/chips/video-shorts.svg', targetColumn: 'goal' },
    { id: 'video-shorts-2', titleKey: 'blocks.videoShortsConstraintsTitle', contentKey: 'blocks.videoShortsConstraintsContent', niche: 'videos:shorts', structure: 'STAR', level: 'intermediate', tags: ['videos', 'shorts'], image: '/chips/video-shorts.svg', targetColumn: 'constraints' },
];

// Expanded tools
const expandedTools = [
    { id: 'web-search', nameKey: 'tools.webSearch', descriptionKey: 'tools.webSearchDesc' },
    { id: 'file-reader', nameKey: 'tools.fileReader', descriptionKey: 'tools.fileReaderDesc' },
    { id: 'code-runner', nameKey: 'tools.codeRunner', descriptionKey: 'tools.codeRunnerDesc' },
    { id: 'image-analyzer', nameKey: 'tools.imageAnalyzer', descriptionKey: 'tools.imageAnalyzerDesc' },
    { id: 'ticket-writer', nameKey: 'tools.ticketWriter', descriptionKey: 'tools.ticketWriterDesc' },
    { id: 'api-caller', nameKey: 'tools.apiCaller', descriptionKey: 'tools.apiCallerDesc' },
    { id: 'db-query', nameKey: 'tools.dbQuery', descriptionKey: 'tools.dbQueryDesc' },
    { id: 'email-sender', nameKey: 'tools.emailSender', descriptionKey: 'tools.emailSenderDesc' },
    { id: 'pdf-reader', nameKey: 'tools.pdfReader', descriptionKey: 'tools.pdfReaderDesc' },
    { id: 'chart-generator', nameKey: 'tools.chartGenerator', descriptionKey: 'tools.chartGeneratorDesc' },
    { id: 'slack-notifier', nameKey: 'tools.slackNotifier', descriptionKey: 'tools.slackNotifierDesc' },
    { id: 'scheduler', nameKey: 'tools.scheduler', descriptionKey: 'tools.schedulerDesc' },
];

function main() {
    console.log('🌱 Seeding data...\n');

    // Write blocks
    fs.writeFileSync(BLOCKS_PATH, JSON.stringify(expandedBlocks, null, 2));
    console.log(`✅ Written ${expandedBlocks.length} blocks to ${BLOCKS_PATH}`);

    // Write tools
    fs.writeFileSync(TOOLS_PATH, JSON.stringify(expandedTools, null, 2));
    console.log(`✅ Written ${expandedTools.length} tools to ${TOOLS_PATH}`);

    console.log('\n📝 Next steps:');
    console.log('1. Add i18n keys to src/i18n/messages/en.json and es.json');
    console.log('2. Create placeholder images in public/chips/ for new niches');
    console.log('3. Run `npm run dev` to test');
}

main();
