
import { convertToPlainText } from 'https://cdn.skypack.dev/mammoth/mammoth.browser.min.js';

const SUPABASE_URL = 'https://nnkxnejefgoymqszgvrq.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ua3huZWplZmdveW1xc3pndnJxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDU0NjE2NDgsImV4cCI6MjA2MTAzNzY0OH0.OBpHCRz9iAnBS1tlnEBzEo2nbiwt-LB7X3VKysCfNcY';
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const logEl = document.getElementById('log');

async function uploadFiles() {
  const files = document.getElementById('fileInput').files;
  const rotationStatus = document.getElementById('rotationCheck').checked ? 'rotation' : 'new';
  logEl.textContent = '';

  for (const file of files) {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const { value: docxText } = await convertToPlainText({ arrayBuffer });

      const titleMatch = docxText.match(/\*\*TITLE\*\*\s+(.*)/i);
      const title = titleMatch ? titleMatch[1].trim() : file.name;

      const cookTime = (docxText.match(/COOK TIME:\s*(.*)/i) || [])[1]?.trim() || '';
      const sourceName = (docxText.match(/SOURCE:\s*(.*)/i) || [])[1]?.trim() || 'Unknown';

      const ingredientsMatch = docxText.match(/Ingredients\s+([\s\S]*?)Method/i);
      const methodMatch = docxText.match(/Method\s+([\s\S]*?)#\w/i);
      const tagsMatch = docxText.match(/(#\w+(?:\s+#\w+)*)/i);

      const ingredients = ingredientsMatch ? ingredientsMatch[1].trim().split('\n').map(x => x.trim()).filter(Boolean) : [];
      const method = methodMatch ? methodMatch[1].trim().split('\n').map(x => x.trim()).filter(Boolean) : [];
      const tags = tagsMatch ? tagsMatch[1].split(/\s+/).map(tag => tag.replace('#', '')) : [];

      let { data: existingSource, error: sourceError } = await supabase
        .from('sources')
        .select('*')
        .eq('name', sourceName)
        .single();

      if (sourceError && sourceError.code !== 'PGRST116') throw sourceError;

      if (!existingSource) {
        const { data: newSource, error: insertError } = await supabase
          .from('sources')
          .insert({ name: sourceName })
          .select()
          .single();
        if (insertError) throw insertError;
        existingSource = newSource;
      }

      const { error: insertRecipeError } = await supabase.from('recipes').insert({
        title,
        cook_time: cookTime,
        ingredients,
        method,
        tags,
        source_id: existingSource.id,
        rotation_status: rotationStatus
      });

      if (insertRecipeError) throw insertRecipeError;

      logEl.textContent += `✅ Uploaded: ${title}\n`;
    } catch (err) {
      logEl.textContent += `❌ Error with ${file.name}: ${err.message || err}\n`;
    }
  }
}
