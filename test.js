async function main() {
    try {
      // Dynamically import the module
      const { incomeSankey } = await import('./sankey.mjs');
      
      // Access the function from the imported module
      //const { incomeSankey } = sankeyModule;
      
      // Call the function
      await incomeSankey('META');
    } catch (error) {
      console.error('Error importing module or calling function:', error);
    }
  }
  
  // Run the main function
  main();