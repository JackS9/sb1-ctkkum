import { createWorker } from 'tesseract.js';
import { Configuration, OpenAIApi } from 'openai';

const configuration = new Configuration({
  apiKey: import.meta.env.VITE_OPENAI_API_KEY,
});

const openai = new OpenAIApi(configuration);

export async function scanWineLabel(imageSource: string | File): Promise<any> {
  // Initialize Tesseract.js
  const worker = await createWorker();
  await worker.loadLanguage('eng');
  await worker.initialize('eng');

  // Convert File to base64 if needed
  let imageData = imageSource;
  if (imageSource instanceof File) {
    imageData = await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.readAsDataURL(imageSource);
    });
  }

  // Perform OCR
  const { data: { text } } = await worker.recognize(imageData);
  await worker.terminate();

  // Use GPT to extract wine information
  const completion = await openai.createChatCompletion({
    model: "gpt-4-vision-preview",
    messages: [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: `Extract wine information from this label. The OCR text is: ${text}. 
                  Please provide: name, producer, vintage, region, country, varietal, 
                  and any other relevant details you can find.`
          }
        ]
      }
    ]
  });

  const wineData = JSON.parse(completion.data.choices[0].message.content || '{}');
  return wineData;
}