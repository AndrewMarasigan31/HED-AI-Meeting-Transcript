// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ENVIRONMENT VARIABLES LOADER
// Loads .env file into process.env
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env from project root
config({ path: join(__dirname, '..', '.env') });

// Validate required environment variables
const required = ['ATTIO_API_KEY', 'ANTHROPIC_API_KEY'];
const missing = required.filter(key => !process.env[key]);

if (missing.length > 0) {
  console.error('❌ Missing required environment variables:');
  missing.forEach(key => console.error(`   - ${key}`));
  console.error('\n💡 Make sure you have a .env file in the project root.');
  console.error('   See .env.example for reference.\n');
  process.exit(1);
}

console.log('✅ Environment variables loaded');






