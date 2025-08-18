// Script to check Netlify environment variables
const { execSync } = require('child_process');

function checkNetlifyEnv() {
  console.log('🔍 Checking Netlify environment variables...\n');

  try {
    const envList = execSync('netlify env:list', { encoding: 'utf8' });

    const hasUsername = envList.includes('FFIEC_USERNAME');
    const hasToken = envList.includes('FFIEC_TOKEN');

    console.log('FFIEC_USERNAME:', hasUsername ? '✅ Set' : '❌ Missing');
    console.log('FFIEC_TOKEN:', hasToken ? '✅ Set' : '❌ Missing');

    if (!hasUsername || !hasToken) {
      console.log('\n🔧 To fix missing credentials:');
      console.log('netlify env:set FFIEC_USERNAME your_username');
      console.log('netlify env:set FFIEC_TOKEN your_security_token');
    } else {
      console.log('\n✅ All FFIEC credentials are configured');
    }

  } catch (error) {
    console.log('❌ Error checking environment variables:', error.message);
    console.log('Make sure you are in the dev/ directory and Netlify CLI is installed');
  }
}

checkNetlifyEnv();
