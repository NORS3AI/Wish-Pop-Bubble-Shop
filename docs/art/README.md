# 🎨 Your custom art goes here

Drop image files into **this folder** (`docs/art/`) and they will **automatically
replace the matching emoji** in the game. You don't have to touch any code.

- If a file is here with the **exact name** below, the game shows **your image**.
- If it's **not** here, the game just shows the **original emoji**. Nothing breaks.
- So you can add art **a few at a time, in any order** — start with your favorites.

After you add or change files, **reload the game** (and on the live site, wait a
minute for it to update, then refresh).

## How to add a file
1. Make your picture (see tips below) and **name it exactly** as listed — all
   lowercase, with underscores, ending in `.png`. Example: `ing_honey.png`.
2. Put it in this `art` folder (upload it here on GitHub, or hand it to me and I'll
   place it).
3. Reload the game. Done!

## Picture tips (so they look good)
- **Format:** PNG with a **transparent background** works best.
- **Shape:** square, roughly **256×256 up to 512×512 pixels**, subject centered.
- **Icons (ingredients, charms, buddies):** square, transparent, filling most of
  the frame.
- **Characters (customers):** square, transparent, character centered.
- **Background:** a tall **portrait** image, about **1080×1920** (phone shape).
  Named `background.png`. The game darkens it slightly so text stays readable.
- Keep files reasonably small (a few hundred KB each) so the game loads fast.

---

## The full name list

### Background
| File name | Replaces |
|---|---|
| `background.png` | The whole screen background (tall portrait picture) |

### Logo (main screen)
| File name | Replaces |
|---|---|
| `logo.png` | The **“Wish Pop / Bubble Shop”** title on the main menu. Drop it in and your logo shows instead of the text. A wide, transparent PNG works best (it's shown about 300px wide). |

### Ingredients (20)
| File name | Replaces |
|---|---|
| `ing_honey.png` | 🍯 Honey |
| `ing_berries.png` | 🫐 Berries |
| `ing_rose_jam.png` | 🌹 Rose Jam |
| `ing_pearl_sugar.png` | ⚪ Pearl Sugar |
| `ing_moon_drop.png` | 🌙 Moon Drop |
| `ing_mushroom_cap.png` | 🍄 Mushroom Cap |
| `ing_star_candy.png` | 🍬 Star Candy |
| `ing_rainbow_drop.png` | 🌈 Rainbow Drop |
| `ing_sun_petal.png` | 🌻 Sun Petal |
| `ing_glow_gem.png` | 💎 Glow Gem |
| `ing_iron_oats.png` | 🌰 Iron Oats |
| `ing_bull_horn.png` | 🐂 Bull Horn |
| `ing_dragon_pepper.png` | 🌶️ Dragon Pepper |
| `ing_cinnamon.png` | 🟤 Cinnamon |
| `ing_ginger_root.png` | 🫚 Ginger Root |
| `ing_lavender.png` | 🪻 Lavender |
| `ing_moss_bloom.png` | 🌿 Moss Bloom |
| `ing_shimmer_salt.png` | 🧂 Shimmer Salt |
| `ing_crow_feather.png` | 🪶 Crow Feather |
| `ing_frog_tear.png` | 💧 Frog Tear |

### Charms & tools (7)
| File name | Replaces |
|---|---|
| `charm_cleanse.png` | 🧹 Cleanse |
| `charm_insight.png` | 🔍 Insight |
| `charm_potent.png` | ✨ Potent |
| `charm_peek.png` | ⏭️ Peek |
| `charm_wild.png` | 🌈 Wild |
| `charm_knife.png` | 🔪 Knife |
| `charm_transmute.png` | 🔀 Transmute |
| `charm_pinch.png` | 🤏 Pinch |

### Customers (8) — with four expressions each
Each base-game customer can have **four faces**, shown at the right moment:

- **normal** — the plain filename (e.g. `customer_wolf.png`). Shown when they arrive with their wish.
- **happy** — `..._happy.png`. Shown on the results screen when you make their wish.
- **angry** — `..._angry.png`. Shown when you fail their wish.
- **allergic** — `..._allergic.png`. Shown when the potion gave them an allergy reaction.

You can add them a few at a time — any face you haven't uploaded just falls back to the emoji.
(These can be full head-to-toe character pictures; the game centers and scales them.)

| Customer | normal | happy | angry | allergic |
|---|---|---|---|---|
| 🍪 Gingerbread Man | `customer_gingerbread.png` | `customer_gingerbread_happy.png` | `customer_gingerbread_angry.png` | `customer_gingerbread_allergic.png` |
| 🧁 Muffin Man | `customer_muffin.png` | `customer_muffin_happy.png` | `customer_muffin_angry.png` | `customer_muffin_allergic.png` |
| 👨‍🍳 Village Baker | `customer_baker.png` | `customer_baker_happy.png` | `customer_baker_angry.png` | `customer_baker_allergic.png` |
| 🐭 Tiny Mouse | `customer_mouse.png` | `customer_mouse_happy.png` | `customer_mouse_angry.png` | `customer_mouse_allergic.png` |
| 🦉 Sleepy Owl | `customer_owl.png` | `customer_owl_happy.png` | `customer_owl_angry.png` | `customer_owl_allergic.png` |
| 👧 Little Red | `customer_little_red.png` | `customer_little_red_happy.png` | `customer_little_red_angry.png` | `customer_little_red_allergic.png` |
| 🐺 Wolf | `customer_wolf.png` | `customer_wolf_happy.png` | `customer_wolf_angry.png` | `customer_wolf_allergic.png` |
| 🧝 Garden Gnome | `customer_gnome.png` | `customer_gnome_happy.png` | `customer_gnome_angry.png` | `customer_gnome_allergic.png` |

### Buddy (Toad) skins (7)
These are the little friend in the corner and in the "My Skins" wardrobe.
| File name | Replaces |
|---|---|
| `buddy_toad_classic.png` | 🐸 Toad (the default) |
| `buddy_toad_dragon.png` | 🐲 Dragon |
| `buddy_toad_cat.png` | 🐱 Cat |
| `buddy_toad_owl.png` | 🦉 Owl |
| `buddy_toad_fox.png` | 🦊 Fox |
| `buddy_toad_unicorn.png` | 🦄 Unicorn |
| `buddy_toad_bunny.png` | 🐰 Bunny |
| `buddy_toad_raccoon.png` | 🦝 Trash Bandit (🏆 earned by recycling 1000 junk) |

### Cauldron (pot) skins (7)
Optional — a picture of the pot itself. Best with a **transparent middle** so the
potion still shows filling up inside. If you don't add these, the pretty colored
pots stay as they are.
| File name | Replaces |
|---|---|
| `cauldron_classic.png` | Classic Cauldron |
| `cauldron_rose.png` | Rose Gold |
| `cauldron_emerald.png` | Emerald |
| `cauldron_sapphire.png` | Sapphire |
| `cauldron_amethyst.png` | Amethyst |
| `cauldron_gold.png` | Golden |
| `cauldron_rainbow.png` | Rainbow |
| `cauldron_trashcan.png` | Trash Can (🏆 earned by recycling 500 junk) |

### Scoop & bubbles
| File name | Replaces |
|---|---|
| `scoop_spoon.png` | 🥄 The scoop/spoon in the Scoop phase |
| `bubble.png` | 🫧 The floating bubbles you pop (and the scoop bubbles) |
| `bubble_bonus.png` | The golden **bonus** bubble (optional — leave it out to keep the glowing gold look) |

**Resizing the scoop spoon:** in the Scoop phase there are small **−  spoon size  +**
buttons under the spoon. Tap them to make your spoon image bigger or smaller until
it looks right; the game remembers your choice. (I can also set an exact size for
you once you've uploaded it — just ask.)

### Trash (8) — junk a disgruntled customer throws when you fail their wish
| File name | Replaces |
|---|---|
| `trash_banana.png` | 🍌 Banana Peel |
| `trash_fishbones.png` | 🐟 Fishy Bones |
| `trash_lint.png` | 🧶 Pocket Lint |
| `trash_rock.png` | 🪨 Old Rock |
| `trash_boot.png` | 🥾 Soggy Boot |
| `trash_can.png` | 🥫 Rusty Can |
| `trash_core.png` | 🍎 Apple Core |
| `trash_bone.png` | 🦴 Old Bone |
| `trash_bag.png` | 🛍️ Crumpled Bag (the mystery you open in the bin) |
| `trash_ring.png` | 💍 Gold Ring (the rare treasure inside a bag) |

### King's Courtyard pantry (the 🏰 realm's ingredients)
These appear when you're playing in King's Courtyard. Optional — emojis until you add art.
| File name | Replaces |
|---|---|
| `ing_kc_goblet_wine.png` | 🍷 Goblet Wine |
| `ing_kc_royal_decree.png` | 📜 Royal Decree |
| `ing_kc_beeswax.png` | 🕯️ Beeswax Candle |
| `ing_kc_royal_lily.png` | ⚜️ Royal Lily |
| `ing_kc_herald_brass.png` | 🎺 Herald's Brass |
| `ing_kc_amphora.png` | 🏺 Sealed Amphora |
| `ing_kc_cherries.png` | 🍒 Sugared Cherries |
| `ing_kc_grapes.png` | 🍇 Vineyard Grapes |
| `ing_kc_castle_olive.png` | 🫒 Castle Olive |
| `ing_kc_onyx_pawn.png` | ♟️ Onyx Pawn |
| `ing_kc_aged_cheese.png` | 🧀 Aged Cheese |
| `ing_kc_pungent_bulb.png` | 🧅 Pungent Bulb |
| `ing_kc_toast_fizz.png` | 🥂 Toast Fizz |
| `ing_kc_peacock.png` | 🦚 Peacock Plume |
| `ing_kc_regal_tea.png` | 🫖 Regal Tea |
| `ing_kc_court_wand.png` | 🪄 Court Wand |
| `ing_kc_white_dove.png` | 🕊️ White Dove |
| `ing_kc_blackbird_pie.png` | 🥧 Blackbird Pie |
| `ing_kc_silk_rosette.png` | 🏵️ Silk Rosette |
| `ing_kc_royal_cocoa.png` | 🍫 Royal Cocoa |
| `ing_kc_griffin_egg.png` | 🪺 Griffin Egg (infused: next ingredient is Potent) |
| `ing_kc_royal_seal.png` | 🔒 Royal Seal (infused: locks a bar) |

### The Drury Lane Bake-Off — decorations (memory event)
These are the six decorations you place on the cake in the bake-off. Drop art in and it
replaces the emoji everywhere (the tool buttons, the cake spots, and the results comparison).
Optional — they use emojis until you add art.
| File name | Replaces |
|---|---|
| `dec_icing_swirl.png` | 🍦 Icing Swirl |
| `dec_icing_dollop.png` | ⚪ Icing Dollop |
| `dec_cherry.png` | 🍒 Cherry |
| `dec_strawberry.png` | 🍓 Strawberry |
| `dec_choc_sprinkles.png` | 🍫 Chocolate Sprinkles |
| `dec_rainbow_sprinkles.png` | 🌈 Rainbow Sprinkles |

### The Evil Queen's cursed pantry (villain event only)
These only show up during the Evil Queen ransom event. Optional — they use emojis until you add art.
| File name | Replaces |
|---|---|
| `ing_q_nightshade.png` | 🟣 Nightshade |
| `ing_q_toadstool.png` | 🍄 Toadstool |
| `ing_q_ravenfeather.png` | 🪶 Raven Feather |
| `ing_q_venomvine.png` | 🌿 Venom Vine |
| `ing_q_frostberry.png` | 🫐 Frost Berry |
| `ing_q_emberroot.png` | 🥔 Ember Root |
| `ing_q_moonthistle.png` | 🌸 Moon Thistle |
| `ing_q_glimmercap.png` | 💠 Glimmer Cap |
| `ing_q_wispdust.png` | ✨ Wisp Dust |
| `ing_q_bloodplum.png` | 🍑 Blood Plum |
| `cauldron_queen.png` | 🪞 Queen's Mirror cauldron skin (won by beating her) |

### Little icons (optional)
| File name | Replaces |
|---|---|
| `well_star.png` | 🌟 The Wishing Well star |
| `icon_gold.png` | 🪙 The coin shown when you find gold |
| `icon_treat.png` | 🐸 The treat shown when you find one |

---

## Dance minigame assets (staged — not wired into the game yet)

Sliced and background-removed, waiting on a ballroom background + the knight set
before we build the minigame.

| Files | What it is |
| --- | --- |
| `cinderella_dance_1..5.png` | Cinderella's graceful dance poses (shown on correct moves) |
| `cinderella_worried_1..4.png` | Cinderella's worried/oops reactions (one shows on a wrong move) |
| `prince_dance_1..5.png` | The clumsy prince's dance poses (one set for now) |
| `ui/dance_move_1..4.png` | The four move buttons: 1 = twirl-left, 2 = twirl-right, 3 = leap-up, 4 = curtsy |

**Planned screen layout (top → bottom):** big dancer centered → dance-move
announcement (below the dancer) → timing/meter bar → the big move buttons pinned
at the bottom. (Knight dance set + ballroom background still to come.)

---

*Tip: not sure what to name something, or want a shape supported that isn't listed
(like the scoop or the pop bubbles)? Just ask me and I'll wire it up.*
