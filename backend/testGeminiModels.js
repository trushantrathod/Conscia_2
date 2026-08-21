import dotenv from 'dotenv';
import axios from 'axios';

dotenv.config();

const API_KEY = process.env.GEMINI_API_KEY;

if (!API_KEY) {
  console.error('❌ GEMINI_API_KEY is missing.');
  process.exit(1);
}

async function getEligibleModels() {
  const response = await axios.get(
    'https://generativelanguage.googleapis.com/v1beta/models',
    {
      params: {
        key: API_KEY,
        pageSize: 100,
      },
    }
  );

  return (response.data.models || [])
    .filter((model) =>
      model.supportedGenerationMethods?.includes('generateContent')
    )
    .map((model) => model.name.replace('models/', ''));
}

async function testModel(model) {
  try {
    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
      {
        contents: [
          {
            parts: [
              {
                text: 'Reply with exactly: OK',
              },
            ],
          },
        ],
      },
      {
        params: {
          key: API_KEY,
        },
      }
    );

    const text =
      response.data?.candidates?.[0]?.content?.parts?.[0]?.text || '';

    return {
      model,
      success: true,
      response: text.trim(),
      error: null,
    };
  } catch (error) {
    return {
      model,
      success: false,
      response: null,
      error:
        error.response?.data?.error?.message ||
        error.message ||
        'Unknown error',
    };
  }
}

async function main() {
  console.log('🔍 Fetching eligible Gemini models...\n');

  let models;

  try {
    models = await getEligibleModels();
  } catch (error) {
    console.error('❌ Could not fetch models.');
    console.error(
      error.response?.data || error.message
    );
    return;
  }

  console.log(`Found ${models.length} eligible models.\n`);
  console.log('🧪 Testing models...\n');

  const results = [];

  for (const model of models) {
    process.stdout.write(`Testing ${model} ... `);

    const result = await testModel(model);
    results.push(result);

    if (result.success) {
      console.log('✅ WORKING');
    } else {
      console.log('❌ FAILED');
      console.log(`   ${result.error}`);
    }
  }

  console.log('\n========== SUMMARY ==========\n');

  const workingModels = results.filter((r) => r.success);

  if (workingModels.length === 0) {
    console.log('❌ No Gemini model successfully generated content.');
    return;
  }

  console.log('✅ Models that actually work:\n');

  workingModels.forEach((result, index) => {
    console.log(
      `${index + 1}. ${result.model} → "${result.response}"`
    );
  });

  console.log('\n=============================');
}

main();