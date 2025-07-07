const ejs = require('ejs');
const path = require('path');

async function testEJS() {
    try {
        const template = path.join(__dirname, 'template.ejs');
        const html = await ejs.renderFile(template, {
            title: 'EJS Test',
            name: 'Developer'
        });
        console.log('✅ EJS test passed');
        console.log('Generated HTML:', html);
    } catch (error) {
        console.error('❌ EJS test failed:', error.message);
        process.exit(1);
    }
}

testEJS();
