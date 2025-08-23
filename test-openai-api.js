const OpenAI = require('openai');

// Test OpenAI API key
async function testOpenAIAPI() {
  console.log('🔑 Testing OpenAI API Key...\n');
  
  // Check if API key is set
  const apiKey = process.env.OPENAI_API_KEY;
  
  if (!apiKey) {
    console.log('❌ OPENAI_API_KEY environment variable is not set!');
    console.log('Please create a .env.local file with your OpenAI API key.');
    console.log('Example: OPENAI_API_KEY=sk-proj-your-key-here');
    return;
  }
  
  console.log('✅ OPENAI_API_KEY found in environment');
  console.log(`Key preview: ${apiKey.substring(0, 20)}...`);
  
  try {
    // Initialize OpenAI client
    const openai = new OpenAI({
      apiKey: apiKey,
    });
    
    console.log('\n🔄 Testing API connection...');
    
    // Test with a simple models request
    const models = await openai.models.list();
    
    console.log('✅ OpenAI API connection successful!');
    console.log(`Available models: ${models.data.length}`);
    console.log('First few models:');
    models.data.slice(0, 5).forEach(model => {
      console.log(`  - ${model.id}`);
    });
    
    // Test GPT-4o specifically
    console.log('\n🔄 Testing GPT-4o model...');
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "user",
          content: "Hello! Please respond with 'API test successful' if you can see this message."
        }
      ],
      max_tokens: 50
    });
    
    console.log('✅ GPT-4o model test successful!');
    console.log(`Response: ${completion.choices[0].message.content}`);
    
  } catch (error) {
    console.log('❌ OpenAI API test failed!');
    console.log(`Error: ${error.message}`);
    
    if (error.status === 401) {
      console.log('\n🔍 This appears to be an authentication error.');
      console.log('Possible causes:');
      console.log('1. Invalid API key');
      console.log('2. Expired API key');
      console.log('3. Insufficient credits');
      console.log('4. Account suspended');
      console.log('\nPlease check your OpenAI account at: https://platform.openai.com/account/api-keys');
    }
    
    if (error.status === 429) {
      console.log('\n🔍 This appears to be a rate limit error.');
      console.log('You may have exceeded your API usage limits.');
    }
  }
}

// Run the test
testOpenAIAPI().catch(console.error);
