<script>
  document.addEventListener("DOMContentLoaded", () => {
    console.log("Uploader script loaded");

    const SUPABASE_URL = 'https://nnkxnejefgoymqszgvrq.supabase.co';
    const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ua3huZWplZmdveW1xc3pndnJxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDU0NjE2NDgsImV4cCI6MjA2MTAzNzY0OH0.OBpHCRz9iAnBS1tlnEBzEo2nbiwt-LB7X3VKysCfNcY';
    const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

    const fileInput = document.getElementById("file-input");
    const status = document.getElementById("status");

    if (!fileInput) {
      console.error("fileInput not found");
      return;
    }

    fileInput.addEventListener("change", async (event) => {
      const files = event.target.files;
      for (const file of files) {
        if (!file.name.endsWith('.docx')) continue;

        status.textContent = `Processing ${file.name}...`;
        const arrayBuffer = await file.arrayBuffer();
        const result = await mammoth.extractRawText({ arrayBuffer });
        const text = result.value;

        const data = extractRecipe(text);
        const { error } = await supabase.from('recipes').insert([data]);

        if (error) {
          if (error.status === 409 || error.message.includes('duplicate')) {
            console.warn(`${file.name} already exists — skipped.`);
            status.textContent = `${file.name} already exists — skipped.`;
          } else {
            console.error(`Error uploading ${file.name}:`, error);
            status.textContent = `Error uploading ${file.name}: ${error.message}`;
          }
        } else {
          status.textContent = `${file.name} uploaded successfully!`;
        }
      }
    });

    function extractRecipe(text) {
      const titleMatch = text.match(/^([A-Z \\-]+)$/m);
      const title = titleMatch ? titleMatch[1].trim() : 'Untitled';

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
  });
</script>
