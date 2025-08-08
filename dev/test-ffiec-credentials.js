// FFIEC WS-Security Credentials Test Script
// Run with: node test-ffiec-credentials.js

const soap = require('soap');

async function testFFIECCredentials() {
    // Get credentials from environment variables
    const username = process.env.FFIEC_USERNAME;
    const token = process.env.FFIEC_TOKEN;
    const DATA_SERIES = 'Call';

    console.log('=== FFIEC WS-Security Credentials Test ===\n');

    // Check if all credentials are provided
    const missing = [];
    if (!username) missing.push('FFIEC_USERNAME');
    if (!token) missing.push('FFIEC_TOKEN');

    if (missing.length > 0) {
        console.log('❌ Missing environment variables:');
        missing.forEach(v => console.log(`   • ${v}`));
        console.log('\nTo fix this:');
        console.log('1. Copy .env.example to .env');
        console.log('2. Fill in your FFIEC credentials');
        console.log('3. Run: export $(cat .env | xargs) && node test-ffiec-credentials.js');
        process.exit(1);
    }

    console.log('✅ All environment variables present');
    console.log(`   • Username: ${username}`);
    console.log(`   • Token: ${'*'.repeat(token.length)}\n`);

    try {
        console.log('🔌 Connecting to FFIEC SOAP API...');
        
        const wsdlUrl = 'https://cdr.ffiec.gov/Public/PWS/WebServices/RetrievalService.asmx?WSDL';
        
        // Create SOAP client
        const client = await soap.createClientAsync(wsdlUrl, {
            overridePromiseSuffix: 'Promise',
            timeout: 30000
        });

        console.log('✅ SOAP client created successfully');

        // FIXED: Use WS-Security instead of Basic Auth
        console.log('🔐 Setting up WS-Security authentication...');
        
        const wsSecurityPassword = token; // Use token as the password
        
        const wsSecurity = new soap.WSSecurity(username, wsSecurityPassword, {
            passwordType: 'PasswordText',
            hasTimeStamp: false,
            hasTokenCreated: false
        });
        
        client.setSecurity(wsSecurity);
        console.log('✅ WS-Security authentication configured');

        // Test 1: Get reporting periods (simplest test)
        console.log('\n📅 Testing: RetrieveReportingPeriods...');
        
        try {
        const periodsResult = await client.RetrieveReportingPeriodsPromise({
            dataSeries: DATA_SERIES
        });

        if (periodsResult?.[0]?.RetrieveReportingPeriodsResult?.string) {
                const periods = periodsResult[0].RetrieveReportingPeriodsResult.string;
                const periodsArray = Array.isArray(periods) ? periods : [periods];
                const normalized = periodsArray.map(p =>
                    String(p).trim().replace(/([0-9]{4})[\/-]?([0-9]{2})[\/-]?([0-9]{2})/, '$1-$2-$3')
                );
                console.log(`✅ Success! Found ${normalized.length} reporting periods`);
                console.log(`   Latest period: ${normalized[normalized.length - 1]}`);
                console.log(`   Available periods: ${normalized.slice(-3).join(', ')} (last 3)`);

                // Test 2: Try to get panel of reporters
                console.log('\n🏦 Testing: RetrievePanelOfReporters...');
                const latestPeriod = normalized[normalized.length - 1];

                const panelResult = await client.RetrievePanelOfReportersPromise({
                    dataSeries: DATA_SERIES,
                    reportingPeriodEndDate: latestPeriod
                });

                if (panelResult?.[0]?.RetrievePanelOfReportersResult?.FilerIdentification) {
                    const filers = panelResult[0].RetrievePanelOfReportersResult.FilerIdentification;
                    const filersArray = Array.isArray(filers) ? filers : [filers];
                    console.log(`✅ Success! Found ${filersArray.length} reporting institutions`);
                    
                    // Show sample institutions
                    if (filersArray.length > 0) {
                        console.log('   Sample institutions:');
                        filersArray.slice(0, 3).forEach((sample, index) => {
                            const name = sample.Name || sample.BankName || 'Unknown';
                            const id = sample.IDRssd || sample.RSSD_ID || sample.Id_Rssd || 'Unknown';
                            console.log(`     ${index + 1}. ${name} (RSSD: ${id})`);
                        });
                    }
                    
                    console.log('\n🎉 FFIEC API authentication test PASSED!');
                    console.log('\n✅ Your credentials are working correctly');
                    console.log('✅ You have access to the FFIEC Public Web Service');
                    console.log('✅ You can retrieve bank data from the API');

                } else {
                    console.log('⚠️  Panel request succeeded but no institutions returned');
                    console.log('   This might indicate limited API access or data availability');
                    console.log('   Response structure:', Object.keys(panelResult?.[0] || {}));
                }
                
            } else {
                console.log('⚠️  Periods request succeeded but unexpected response format');
                console.log('   Response:', JSON.stringify(periodsResult, null, 2));
            }
            
        } catch (authError) {
            console.log('❌ Authentication failed:');
            console.log(`   Error: ${authError.message}`);
            
            if (authError.message.includes('WSSecurityRequired')) {
                console.log('\n🔍 This error suggests WS-Security is required (which we are using)');
                console.log('   But there may be an issue with the credentials or format');
            } else if (authError.message.includes('Unauthorized') || authError.message.includes('401')) {
                console.log('\n🔍 Authentication failed - check your credentials:');
                console.log('   • Verify your FFIEC username is correct');
                console.log('   • Verify your security token is correct');
                console.log('   • Ensure your account has API access enabled');
            }
            
            throw authError;
        }

        console.log('\n📋 Next steps:');
        console.log('1. Add these same environment variables to your Netlify site');
        console.log('2. Deploy the updated Netlify function');
        console.log('3. Test the WordPress plugin admin interface');
        console.log('4. The function will now authenticate correctly with FFIEC');

    } catch (error) {
        console.log('\n❌ FFIEC API test failed:');
        console.log(`   Error: ${error.message}`);
        
        if (error.message.includes('WSSecurityRequired')) {
            console.log('\n🔍 WS-Security issue:');
            console.log('   • The FFIEC API requires WS-Security with UsernameToken');
            console.log('   • We are using the correct method, but credentials may be wrong');
            console.log('   • Double-check your username and token');
        } else if (error.message.includes('timeout')) {
            console.log('\n🔍 Timeout issue:');
            console.log('   • FFIEC API may be slow or down');
            console.log('   • Try again in a few minutes');
            console.log('   • Check your internet connection');
        } else if (error.message.includes('ENOTFOUND') || error.message.includes('ECONNREFUSED')) {
            console.log('\n🔍 Connection issue:');
            console.log('   • Cannot reach FFIEC servers');
            console.log('   • Check your internet connection');
            console.log('   • FFIEC services may be temporarily down');
        } else {
            console.log('\n🔍 Full error details:');
            console.log(error.stack);
        }
        
        console.log('\n📞 FFIEC Support:');
        console.log('   • Contact FFIEC support if credentials are definitely correct');
        console.log('   • URL: https://cdr.ffiec.gov/public/');
        console.log('   • They can verify your API access status');
        
        process.exit(1);
    }
}

// Run the test
testFFIECCredentials().catch(error => {
    console.error('Unexpected error:', error);
    process.exit(1);
});
