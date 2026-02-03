const fs = require('fs');
const path = require('path');

console.log('🔍 Checking ALL required files exist...\n');

// ALL FILES FROM YOUR LIST - MUST EXIST
const allRequiredFiles = [
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
  'src/components/map/MapView.tsx',
  
  // UI components (ALL shadcn files)
  'src/components/ui/accordion.tsx',
  'src/components/ui/alert-dialog.tsx',
  'src/components/ui/alert.tsx',
  'src/components/ui/aspect-ratio.tsx',
  'src/components/ui/avatar.tsx',
  'src/components/ui/badge.tsx',
  'src/components/ui/breadcrumb.tsx',
  'src/components/ui/button.tsx',
  'src/components/ui/calendar.tsx',
  'src/components/ui/card.tsx',
  'src/components/ui/carousel.tsx',
  'src/components/ui/chart.tsx',
  'src/components/ui/checkbox.tsx',
  'src/components/ui/collapsible.tsx',
  'src/components/ui/command.tsx',
  'src/components/ui/context-menu.tsx',
  'src/components/ui/dialog.tsx',
  'src/components/ui/drawer.tsx',
  'src/components/ui/dropdown-menu.tsx',
  'src/components/ui/form.tsx',
  'src/components/ui/hover-card.tsx',
  'src/components/ui/input-otp.tsx',
  'src/components/ui/label.tsx',
  'src/components/ui/menubar.tsx',
  'src/components/ui/navigation-menu.tsx',
  'src/components/ui/pagination.tsx',
  'src/components/ui/popover.tsx',
  'src/components/ui/progress.tsx',
  'src/components/ui/radio-group.tsx',
  'src/components/ui/resizable.tsx',
  'src/components/ui/scroll-area.tsx',
  'src/components/ui/select.tsx',
  'src/components/ui/separator.tsx',
  'src/components/ui/sheet.tsx',
  'src/components/ui/sidebar.tsx',
  'src/components/ui/skeleton.tsx',
  'src/components/ui/slider.tsx',
  'src/components/ui/sonner.tsx',
  'src/components/ui/switch.tsx',
  'src/components/ui/table.tsx',
  'src/components/ui/tabs.tsx',
  'src/components/ui/textarea.tsx',
  'src/components/ui/toast.tsx',
  'src/components/ui/toaster.tsx',
  'src/components/ui/toggle-group.tsx',
  'src/components/ui/toggle.tsx',
  'src/components/ui/tooltip.tsx',
  'src/components/ui/use-toast.ts',
  
  // Core components
  'src/components/AdminDashboard.tsx',
  'src/components/ErrorBoundary.tsx',
  'src/components/NavLink.tsx',
  'src/components/Sidebar.tsx',
  
  // Hooks
  'src/hooks/use-mobile.tsx',
  'src/hooks/use-toast.ts',
  'src/hooks/useAuth.ts',
  'src/hooks/useLiveLocations.ts',
  'src/hooks/useLocations.ts',
  'src/hooks/useMap.ts',
  
  // Supabase integration
  'src/integrations/supabase/client.ts',
  'src/integrations/supabase/types.ts',
  
  // Pages
  'src/pages/Admin.tsx',
  'src/pages/Auth.tsx',
  'src/pages/Index.tsx',
  'src/pages/NotFound.tsx',
  
  // Services
  'src/services/api/authApi.ts',
  'src/services/api/baseApi.ts',
  'src/services/api/index.ts',
  'src/services/api/liveLocationsApi.ts',
  'src/services/index.ts',
  'src/services/types.ts',
  
  // Test files
  'src/test/example.test.ts',
  'src/test/setup.ts',
  
  // App files
  'src/App.css',
  'src/App.tsx',
  'src/index.css',
  'src/main.tsx',
  'src/vite-env.d.ts',
  
  // Supabase functions (OPTIONAL - only if you have them)
  // 'supabase/functions/auth/index.ts',
  // 'supabase/functions/get-maptiler-key/index.ts',
  // 'supabase/functions/live-locations/index.ts',
  // 'supabase/functions/locations/index.ts',
  
  // Supabase migrations (OPTIONAL - only if you have them)
  // 'supabase/migrations/20260128104851_8413118f-ac74-4c37-bc6f-2a12ebac40c5.sql',
  
  // Supabase config (OPTIONAL - only if using local Supabase)
  // 'supabase/config.toml',
  
  // Environment
  '.env',
  
  // Git
  '.gitignore',
  
  // Package management
  'package.json',
  
  // Config files
  'components.json',
  'eslint.config.js',
  'index.html',
  'postcss.config.js',
  'README.md',
  'tailwind.config.ts',
  'tsconfig.app.json',
  'tsconfig.json',
  'tsconfig.node.json',
  'vite.config.ts',
  'vitest.config.ts'
];

// Check EVERY file exists
let missingFiles = [];
let existingFiles = 0;
let warningFiles = [];

allRequiredFiles.forEach(file => {
  if (fs.existsSync(file)) {
    existingFiles++;
  } else {
    // Check if it's an optional Supabase file
    if (file.includes('supabase/')) {
      warningFiles.push(file);
    } else {
      missingFiles.push(file);
    }
  }
});

// Report results
console.log(`📊 Files checked: ${allRequiredFiles.length}`);
console.log(`✅ Files found: ${existingFiles}`);

if (warningFiles.length > 0) {
  console.log(`⚠️  Optional files not found: ${warningFiles.length}`);
  console.log('   (These are optional for external Supabase setup)\n');
}

if (missingFiles.length > 0) {
  console.log(`❌ Required files missing: ${missingFiles.length}\n`);
  
  // Group missing files by category
  const categories = {
    'GitHub Templates': missingFiles.filter(f => f.includes('.github/')),
    'Public Assets': missingFiles.filter(f => f.includes('public/')),
    'Map Components': missingFiles.filter(f => f.includes('components/map/')),
    'UI Components': missingFiles.filter(f => f.includes('components/ui/')),
    'Core Components': missingFiles.filter(f => f.includes('components/') && !f.includes('ui/') && !f.includes('map/')),
    'Hooks': missingFiles.filter(f => f.includes('hooks/')),
    'Supabase Integration': missingFiles.filter(f => f.includes('integrations/')),
    'Pages': missingFiles.filter(f => f.includes('pages/')),
    'Services': missingFiles.filter(f => f.includes('services/')),
    'Test Files': missingFiles.filter(f => f.includes('test/')),
    'App Files': missingFiles.filter(f => f.startsWith('src/') && !f.includes('components/') && !f.includes('hooks/') && !f.includes('integrations/') && !f.includes('pages/') && !f.includes('services/') && !f.includes('test/')),
    'Config Files': missingFiles.filter(f => !f.includes('src/') && !f.includes('public/') && !f.includes('.github/') && !f.includes('supabase/'))
  };
  
  // Show missing files by category
  Object.entries(categories).forEach(([category, files]) => {
    if (files.length > 0) {
      console.log(`📁 ${category}:`);
      files.forEach(file => {
        console.log(`   ❌ ${file}`);
      });
      console.log('');
    }
  });
  
  console.log('🚨 Required files are missing!');
  process.exit(1);
}

console.log('\n🎉 SUCCESS: All required files are present!\n');

// Quick tech stack verification
console.log('🔧 Verifying tech stack...');
try {
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };
  
  // Check for key technologies
  const requiredTech = {
    'React': deps.react && deps['react-dom'],
    'TypeScript': deps.typescript,
    'Tailwind CSS': deps.tailwindcss,
    'Supabase Client': deps['@supabase/supabase-js'],
    'Vite': deps.vite,
    'shadcn/ui Components': Object.keys(deps).some(k => k.includes('@radix-ui'))
  };
  
  const optionalTech = {
    'Testing (Vitest)': deps.vitest,
    'ESLint': deps.eslint,
    'Map Library': deps['maplibre-gl'] || deps['react-map-gl']
  };
  
  console.log('✅ Required tech stack:');
  Object.entries(requiredTech).forEach(([tech, present]) => {
    console.log(`   ${present ? '✓' : '❌'} ${tech}`);
    if (!present && tech !== 'shadcn/ui Components') {
      console.log(`      ⚠️  Missing: ${tech} is required!`);
    }
  });
  
  console.log('\n📦 Optional dependencies:');
  Object.entries(optionalTech).forEach(([tech, present]) => {
    console.log(`   ${present ? '✓' : '○'} ${tech}`);
  });
  
  // Check for CI/CD files
  console.log('\n🔧 CI/CD Configuration:');
  const cicdFiles = {
    'GitHub Actions CI': fs.existsSync('.github/workflows/ci.yml'),
    'GitHub Actions CD': fs.existsSync('.github/workflows/deploy.yml'),
    'Validation Script': fs.existsSync('scripts/validate.cjs'),
    'ESLint Config': fs.existsSync('eslint.config.js')
  };
  
  Object.entries(cicdFiles).forEach(([file, exists]) => {
    console.log(`   ${exists ? '✓' : '○'} ${file}`);
  });
  
  // Check environment variables in .env
  if (fs.existsSync('.env')) {
    const envContent = fs.readFileSync('.env', 'utf8');
    const envVars = {
      'VITE_SUPABASE_URL': envContent.includes('VITE_SUPABASE_URL'),
      'VITE_SUPABASE_ANON_KEY': envContent.includes('VITE_SUPABASE_ANON_KEY'),
      'VITE_API_URL': envContent.includes('VITE_API_URL')
    };
    
    console.log('\n🔑 Environment Variables (.env):');
    Object.entries(envVars).forEach(([varName, exists]) => {
      console.log(`   ${exists ? '✓' : '○'} ${varName}`);
    });
  }
  
} catch (error) {
  console.error('⚠️  Could not analyze package.json:', error.message);
}

// Check for hardcoded Maptiler key (security warning)
console.log('\n⚠️  Security Check:');
try {
  const useMapContent = fs.readFileSync('src/hooks/useMap.ts', 'utf8');
  if (useMapContent.includes("'4wu3rv7xXgID64RMlznr'")) {
    console.log('   ⚠️  Maptiler key is hardcoded in src/hooks/useMap.ts');
    console.log('   💡 Recommendation: Move to environment variable');
  } else if (useMapContent.includes('import.meta.env.VITE_MAPTILER_KEY')) {
    console.log('   ✓ Maptiler key uses environment variable');
  }
} catch (error) {
  console.log('   ○ Could not check useMap.ts');
}

console.log('\n🚀 Project is ready for CI/CD!');
console.log('📝 Next steps:');
console.log('   1. Add GitHub Secrets: VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, VERCEL_TOKEN');
console.log('   2. Push to main branch to trigger deployment');
console.log('   3. Check GitHub Actions tab for CI/CD status');