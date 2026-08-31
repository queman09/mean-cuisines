import { storage } from "./storage";

/**
 * Unique dish-matched photos for catalog recipes (ids 4–40).
 * On boot we UPDATE existing rows by id, setting only image_url.
 * Missing ids are skipped; we never insert or delete recipes.
 */
const IMG = "?auto=format&fit=crop&w=1200&h=800&q=80";
const u = (id: string) => `https://images.unsplash.com/${id}${IMG}`;

export const RECIPE_IMAGE_URLS: Record<number, string> = {
  4: "https://upload.wikimedia.org/wikipedia/commons/thumb/d/d9/Max%27s_Roasted_Chicken_-_Evan_Swigart.jpg/1280px-Max%27s_Roasted_Chicken_-_Evan_Swigart.jpg",
  5: u("photo-1476124369491-e7addf5db371"),
  6: "https://upload.wikimedia.org/wikipedia/commons/0/0b/Ginger_glazed_carrots_2010.jpg",
  7: u("photo-1551504734-5ee1c4a1479b"),
  8: u("photo-1563379926898-05f4575a45d8"),
  9: u("photo-1519708227418-c8fd9a32b7a2"),
  10: u("photo-1667499989723-c4ab9549d63c"),
  11: u("photo-1527477396000-e27163b481c2"),
  12: u("photo-1565557623262-b51c2513a641"),
  13: "https://upload.wikimedia.org/wikipedia/commons/thumb/5/54/Sausage_and_peppers.jpg/1280px-Sausage_and_peppers.jpg",
  14: u("photo-1549203438-a7696aed4dac"),
  15: "https://upload.wikimedia.org/wikipedia/commons/thumb/7/77/Beef_stew.jpg/1280px-Beef_stew.jpg",
  16: u("photo-1544025162-d76694265947"),
  17: u("photo-1603133872878-684f208fb84b"),
  18: u("photo-1605286978633-2dec93ff88a2"),
  19: "https://upload.wikimedia.org/wikipedia/commons/thumb/5/50/Bowl_of_chili.jpg/1280px-Bowl_of_chili.jpg",
  20: "https://upload.wikimedia.org/wikipedia/commons/thumb/9/97/Chocolate_Mug_Cake_%28KETO%2C_LCHF%2C_Low_Carb%2C_Gluten_free%2C_FIT%29.jpg/1280px-Chocolate_Mug_Cake_%28KETO%2C_LCHF%2C_Low_Carb%2C_Gluten_free%2C_FIT%29.jpg",
  21: u("photo-1568901346375-23c9450c58cd"),
  22: "https://upload.wikimedia.org/wikipedia/commons/thumb/7/73/Dal_tadka_and_naan.jpg/1280px-Dal_tadka_and_naan.jpg",
  23: "https://upload.wikimedia.org/wikipedia/commons/2/2a/Roasted_potatoes_in_bowl.jpg",
  24: u("photo-1719957770167-bb66133ba808"),
  25: u("photo-1612874742237-6526221588e3"),
  26: "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c3/Chicken_teriyaki.jpg/1280px-Chicken_teriyaki.jpg",
  27: u("photo-1590412200988-a436970781fa"),
  28: u("photo-1760504526069-ff0f8bf6e4ca"),
  29: "https://upload.wikimedia.org/wikipedia/commons/thumb/b/b5/Tomato_soup.jpg/1280px-Tomato_soup.jpg",
  30: u("photo-1467003909585-2f8a72700288"),
  31: "https://upload.wikimedia.org/wikipedia/commons/thumb/f/fd/Protein_overnight_oats.jpg/1280px-Protein_overnight_oats.jpg",
  32: u("photo-1603894584373-5ac82b2ae398"),
  33: "https://upload.wikimedia.org/wikipedia/commons/5/5f/Greek_Salad_Choriatiki.jpg",
  34: "https://upload.wikimedia.org/wikipedia/commons/thumb/4/43/Pulled_pork.jpg/1280px-Pulled_pork.jpg",
  35: u("photo-1585937421612-70a008356fbe"),
  36: "https://upload.wikimedia.org/wikipedia/commons/8/89/Grilled_cheese_sandwich.jpg",
  37: u("photo-1505253758473-96b7015fcd40"),
  38: u("photo-1576107232684-1279f390859f"),
  39: u("photo-1541519227354-08fa5d50c44d"),
  40: "https://upload.wikimedia.org/wikipedia/commons/3/3c/Yangzhou_fried_rice_and_drinks_25-09-2019.jpg",
};

export function reconcileRecipeImages(): { updated: number; skippedMissing: number; unchanged: number } {
  let updated = 0;
  let skippedMissing = 0;
  let unchanged = 0;
  for (const [idStr, url] of Object.entries(RECIPE_IMAGE_URLS)) {
    const id = Number(idStr);
    const existing = storage.getRecipe(id);
    if (!existing) {
      skippedMissing++;
      continue;
    }
    if (existing.imageUrl === url) {
      unchanged++;
      continue;
    }
    storage.updateRecipe(id, { imageUrl: url });
    updated++;
  }
  console.log(
    `[recipeImages] reconciled image_url by id: ${updated} updated, ${unchanged} already current, ${skippedMissing} missing`,
  );
  return { updated, skippedMissing, unchanged };
}
