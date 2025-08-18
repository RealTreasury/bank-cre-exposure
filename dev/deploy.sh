#!/bin/bash
echo "🚀 Deploying FFIEC functions to Netlify..."
netlify deploy --prod
echo "✅ Deployment complete!"
echo "🔗 Test at: https://stirring-pixie-0b3931.netlify.app/.netlify/functions/ffiec?test=true"
