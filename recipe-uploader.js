<script>
  document.addEventListener("DOMContentLoaded", () => {
    console.log("Uploader script loaded");
    console.log("Script is loaded and executing");

    const SUPABASE_URL = 'https://nnkxnejefgoymqszgvrq.supabase.co';
    const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ua3huZWplZmdveW1xc3pndnJxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDU0NjE2NDgsImV4cCI6MjA2MTAzNzY0OH0.OBpHCRz9iAnBS1tlnEBzEo2nbiwt-LB7X3VKysCfNcY';
    const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

    const fileInput = document.getElementById("file-input");

    if (!fileInput) {
      console.error("fileInput not found");
      return;
    }

    fileInput.addEventListener("change", async (event) => {
      const files = event.target.files;
      clearLog();

      for (const file of files) {
        try {
          if (!file.name.endsWith('.docx')) {
            logStatus(`${file.name} skipped — not a .docx`);
            continue;
          }

          logStatus(`Processing ${file.name}...`);
          const arrayBuffer = await file.arrayBuffer();
          const result = await mammoth.extractRawText({ arrayBuffer });
          const text = result.value;

          const data = extractRecipe(text);
          if (!data.name) {
            logStatus(`${file.name} skipped — no title found.`);
            continue;
          }

          console.log("Uploading:", data);
          const { error } = await supabase.from('recipes').insert([data]);

          if (error) {
            if (error.status === 409 || error.message.includes('duplicate')) {
              logStatus(`${file.name} already exists — skipped.`);
            } else {
              logStatus(`Error uploading ${file.name}`);
              logError(`❌ ${file.name}: ${error.message}`);
            }
          } else {
            logStatus(`${file.name} uploaded successfully!`);
          }

        } catch (err) {
          console.error(`Error processing ${file.name}:`, err);
          logStatus(`❌ Unexpected error with ${file.name}`);
          logError(`❌ ${file.name}: ${err.message}`);
        }
      }
    });

    function extractRecipe(text) {
      const titleMatch = text.match(/^([A-Z \\-]+)$/m);
      const title = titleMatch ? titleMatch[1].trim() : null;

      const cookTimeMatch = text.match(/COOK TIME:\\s*(.+)/i);
      const cookTime = cookTimeMatch ? cookTimeMatch[1].trim() : '';

      const tagsMatch = text.match(/#.+/);
      const tags = tagsMatch ? tagsMatch[0].trim() : '';

      const ingredientsSection = text.split(/INGREDIENTS/i)[1]?.split(/METHOD|M E T H O D/i)[0] || '';
      const ingredients = ingredientsSection.trim();

      return {
        name: title,
        cook_time: cookTime,
        tags: tags,
        ingredients: ingredients,
        prep_method: 'Fresh',
        rotation_status: 'New',
        meal_type: 'Dinner',
        last_cooked: null,
        link: ''
      };
    }

    function logStatus(message) {
      const ul = document.getElementById("status-log");
      const li = document.createElement("li");
      li.textContent = message;
      ul.appendChild(li);
    }

    function logError(message) {
      const ul = document.getElementById("error-log");
      const li = document.createElement("li");
      li.textContent = message;
      ul.appendChild(li);
    }

    function clearLog() {
      document.getElementById("status-log").innerHTML = '';
      document.getElementById("error-log").innerHTML = '';
    }
  });
</script>
