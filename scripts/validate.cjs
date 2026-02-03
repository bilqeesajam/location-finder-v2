const fs = require('fs');
const path = require('path');

console.log('🚀 Validation script starting...');
console.log('📁 Working directory:', process.cwd());
console.log('🔍 Checking ALL required files exist...\n');

// CRITICAL FILES - MUST EXIST (these will cause failure if missing)
const criticalFiles = [
  'package.json',
  'vite.config.ts',
  'tailwind.config.ts',
  'tsconfig.json',
  'src/App.tsx',
  'src/main.tsx',
  'src/components/map/MapView.tsx',
  'src/components/ui/button.tsx',
  'src/components/ui/card.tsx',
  'src/integrations/supabase/client.ts',
  '.env',
  '.github/workflows/ci.yml',
  '.github/workflows/deploy.yml',
  'scripts/validate.cjs'
];

// IMPORTANT FILES - Should exist (warnings only)
const importantFiles = [
  // GitHub templates
  '.github/ISSUE_TEMPLATE/feature-ticket.md',
  '.github/ISSUE_TEMPLATE/testing-qa.md',
  '.github/ISSUE_TEMPLATE/bug-report.md',
  '.github/ISSUE_TEMPLATE/pull_request_template.md',
  
  // Public assets
  'public/favicon.ico',
  'public/placeholder.svg',
  'public/robots.txt',
  
  // Map components
  'src/components/map/AddLocationForm.tsx',
  'src/components/map/LocationPopup.tsx',
  'src/components/map/MapControls.tsx',
  
  // UI components (key ones)
  'src/components/ui/badge.tsx',
  'src/components/ui/form.tsx',
  'src/components/ui/input.tsx',
  'src/components/ui/label.tsx',
  
  // Core components
  'src/components/AdminDashboard.tsx',
  'src/components/ErrorBoundary.tsx',
  'src/components/Sidebar.tsx',
  
  // Hooks
  'src/hooks/useMap.ts',
  'src/hooks/useAuth.ts',
  
  // Pages
  'src/pages/Admin.tsx',
  'src/pages/Auth.tsx',
  'src/pages/Index.tsx',
  
  // Services
  'src/services/api/baseApi.ts',
];

// OPTIONAL FILES (Supabase local files - don't fail if missing)
const optionalFiles = [
  'supabase/functions/auth/index.ts',
  'supabase/functions/get-maptiler-key/index.ts',
  'supabase/functions/live-locations/index.ts',
  'supabase/functions/locations/index.ts',
  'supabase/config.toml',
  'supabase/migrations/'
];

// Check CRITICAL files
console.log('🔴 CRITICAL FILES (must exist):');
let criticalMissing = [];
criticalFiles.forEach(file => {
  if (fs.existsSync(file)) {
    console.log(`   ✅ ${file}`);
  } else {
    console.log(`   ❌ ${file}`);
    criticalMissing.push(file);
  }
});

// Check IMPORTANT files
console.log('\n🟡 IMPORTANT FILES (warnings if missing):');
let importantMissing = [];
importantFiles.forEach(file => {
  if (!fs.existsSync(file)) {
    console.log(`   ⚠️  ${file}`);
    importantMissing.push(file);
  }
});

// Report results
console.log('\n📊 SUMMARY:');
console.log(`   Critical files: ${criticalFiles.length - criticalMissing.length}/${criticalFiles.length} found`);
console.log(`   Important files: ${importantFiles.length - importantMissing.length}/${importantFiles.length} found`);

// FAIL if any critical files are missing
if (criticalMissing.length > 0) {
  console.log(`\n❌ FAIL: ${criticalMissing.length} critical files missing:`);
  criticalMissing.forEach(file => {
    console.log(`   • ${file}`);
  });
  
  // Check if we're in GitHub Actions
  if (process.env.GITHUB_ACTIONS) {
    console.log('\n🚨 In GitHub Actions - exiting with code 1');
  }
  
  process.exit(1); // This WILL fail the CI
}

// Warn about important missing files
if (importantMissing.length > 0) {
  console.log(`\n⚠️  WARNING: ${importantMissing.length} important files missing (but not required):`);
  importantMissing.slice(0, 5).forEach(file => {
    console.log(`   • ${file}`);
  });
  if (importantMissing.length > 5) {
    console.log(`   ... and ${importantMissing.length - 5} more`);
  }
}

// Check package.json tech stack
console.log('\n🔧 Tech Stack Verification:');
try {
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };
  
  const requiredDeps = {
    'React': deps.react,
    'TypeScript': deps.typescript,
    'Tailwind CSS': deps.tailwindcss,
    'Vite': deps.vite,
    'Supabase Client': deps['@supabase/supabase-js']
  };
  
  Object.entries(requiredDeps).forEach(([dep, version]) => {
    console.log(`   ${version ? '✅' : '❌'} ${dep}`);
  });
  
  if (!deps.react || !deps.vite || !deps['@supabase/supabase-js']) {
    console.log('\n⚠️  Missing critical dependencies!');
  }
} catch (error) {
  console.log('   ⚠️  Could not read package.json');
}

// Check .env file
console.log('\n🔑 Environment Check:');
if (fs.existsSync('.env')) {
  try {
    const envContent = fs.readFileSync('.env', 'utf8');
    const hasSupabaseUrl = envContent.includes('VITE_SUPABASE_URL');
    const hasSupabaseKey = envContent.includes('VITE_SUPABASE_ANON_KEY');
    
    console.log(`   ${hasSupabaseUrl ? '✅' : '⚠️ '} VITE_SUPABASE_URL`);
    console.log(`   ${hasSupabaseKey ? '✅' : '⚠️ '} VITE_SUPABASE_ANON_KEY`);
    
    if (!hasSupabaseUrl || !hasSupabaseKey) {
      console.log('   💡 Note: For GitHub Actions, use Secrets not .env file');
    }
  } catch (error) {
    console.log('   ⚠️  Could not read .env file');
  }
} else {
  console.log('   ⚠️  No .env file found (expected for CI)');
}

// Security check for hardcoded Maptiler key
console.log('\n🔒 Security Check:');
try {
  const hooksDir = 'src/hooks';
  if (fs.existsSync(hooksDir)) {
    const files = fs.readdirSync(hooksDir);
    const useMapFile = files.find(f => f.includes('useMap'));
    if (useMapFile) {
      const content = fs.readFileSync(path.join(hooksDir, useMapFile), 'utf8');
      if (content.includes("'4wu3rv7xXgID64RMlznr'")) {
        console.log('   ⚠️  Maptiler key is hardcoded');
      } else if (content.includes('import.meta.env.VITE_MAPTILER_KEY')) {
        console.log('   ✅ Maptiler key uses env variable');
      }
    }
  }
} catch (error) {
  // Ignore - not critical
}

console.log('\n🎉 VALIDATION PASSED!');
console.log('🚀 Project is ready for CI/CD.');

// Explicit exit with success code
process.exit(0);