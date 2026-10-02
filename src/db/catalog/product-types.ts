// Hand-written product types for the synthetic catalogue (decision D23). Every product the generator
// produces is a combination of one type, one invented brand and one invented series name. Nothing here
// comes from Amazon, a real brand's catalogue or a real customer. All brands are invented.

export type Department = "audio" | "kitchen" | "home" | "desk" | "travel" | "wearables";

export type ProductType = {
  category: Department;
  /** Illustration drawn by scripts/generate-product-art.mjs. */
  shape: string;
  /** Noun phrase used in titles: "Over-Ear Headphones". */
  noun: string;
  /** Optional adjectives placed before the noun. */
  mods: string[];
  /** Optional size/capacity suffix: "22 L". */
  sizes?: string[];
  /** Dollar range for the base price. */
  price: [number, number];
  /** Variant colours (offered on a minority of products). */
  colors: string[];
  features: string[];
  /** Spec label and the values it can take. */
  specs: [label: string, values: string[]][];
  blurbs: string[];
  uses: string[];
};

const NEUTRALS = ["Black", "Graphite", "Stone", "White", "Slate", "Charcoal", "Oat", "Navy"];

export const BRANDS: Record<Department, string[]> = {
  audio: ["Orrin", "Halden", "Sonde", "Vireo", "Kaleo", "Tessen", "Rhomb", "Cadel", "Brannock", "Isolde"],
  kitchen: ["Linden", "Ember", "Kestrel", "Fennel", "Marrow", "Ostra", "Pellam", "Quince", "Rudd", "Saltmarsh"],
  home: ["Veld", "Marlow", "Alder", "Cinder", "Dovecote", "Hollis", "Iver", "Juniper", "Knoll", "Larch"],
  desk: ["Tarn", "Quill", "Vantage", "Plinth", "Gridline", "Fathom", "Newel", "Ostro", "Parley", "Strand"],
  travel: ["Tarn", "Cairn", "Drift", "Fell", "Gannet", "Haven", "Ridgeway", "Tolland", "Upland", "Vesper"],
  wearables: ["Marlow", "Tideline", "Brae", "Corvus", "Dunmore", "Fjord", "Gale", "Harrow", "Ibis", "Jetty"],
};

export const SERIES = [
  "Aria", "Nova", "Atlas", "Solstice", "Harbor", "Ridge", "Vale", "Orbit", "Pioneer", "Lattice",
  "Cascade", "Summit", "Cedar", "Slate", "Meadow", "Quartz", "Linen", "Copper", "Birch", "Onyx",
  "Willow", "Zenith", "Echo", "Drift", "Pebble", "Kite", "Mosaic", "Prism", "Tundra", "Basalt",
];

export const PRODUCT_TYPES: ProductType[] = [
  // ---------------------------------------------------------------- audio
  {
    category: "audio", shape: "headphones", noun: "Over-Ear Headphones", price: [39, 349], colors: NEUTRALS,
    mods: ["Wireless", "Noise-Cancelling", "Studio", "Closed-Back", "Open-Back", "Bluetooth"],
    features: ["40 mm dynamic drivers with a balanced, low-distortion sound", "Memory-foam ear cushions for long listening sessions", "Foldable frame with a padded carry pouch", "Detachable 1.2 m cable for wired use", "Multipoint pairing with two devices at once", "Touch-free controls on the ear cup"],
    specs: [["Driver size", ["40 mm", "45 mm", "50 mm"]], ["Battery life", ["30 hours", "40 hours", "50 hours", "60 hours"]], ["Connectivity", ["Bluetooth 5.3", "Bluetooth 5.2", "Bluetooth 5.3 and 3.5 mm"]], ["Weight", ["240 g", "260 g", "285 g", "310 g"]], ["Charging", ["USB-C, 3 h", "USB-C, 2.5 h", "USB-C, 2 h"]]],
    blurbs: ["Over-ear headphones tuned for clear vocals and controlled bass.", "A comfortable pair of closed-back headphones for work, travel and long evenings.", "Wireless headphones with a wide soundstage and a lightweight build."],
    uses: ["Switches between wired and wireless in seconds, so one pair covers the desk and the commute.", "Ships with a USB-C charging cable, a 3.5 mm cable and a travel pouch."],
  },
  {
    category: "audio", shape: "headphones", noun: "On-Ear Headphones", price: [19, 129], colors: NEUTRALS,
    mods: ["Wireless", "Lightweight", "Foldable", "Wired", "Compact"],
    features: ["Swivel ear cups fold flat for a bag or pocket", "Adjustable steel-reinforced headband", "Built-in microphone for calls", "In-line volume and playback controls", "Soft protein-leather ear pads"],
    specs: [["Driver size", ["32 mm", "40 mm"]], ["Battery life", ["20 hours", "30 hours", "35 hours", "No battery (wired)"]], ["Connectivity", ["Bluetooth 5.1", "Bluetooth 5.3", "3.5 mm wired"]], ["Weight", ["150 g", "175 g", "190 g"]]],
    blurbs: ["Light on-ear headphones for everyday listening.", "A compact pair that folds away and still sounds full."],
    uses: ["A good first pair or a spare for the gym bag.", "Comes with a short cable for a wired backup."],
  },
  {
    category: "audio", shape: "earbuds", noun: "True Wireless Earbuds", price: [29, 229], colors: NEUTRALS,
    mods: ["Sport", "Noise-Cancelling", "Compact", "Low-Latency", "Everyday"],
    features: ["Active noise cancelling with a transparency mode", "Secure-fit wings and three sizes of silicone tips", "Pocketable charging case with wireless charging", "IPX5 sweat and splash resistance", "Dual microphones for clearer calls"],
    specs: [["Battery life", ["6 hours (24 with case)", "7 hours (28 with case)", "8 hours (32 with case)"]], ["Water resistance", ["IPX4", "IPX5", "IPX7"]], ["Connectivity", ["Bluetooth 5.3", "Bluetooth 5.4"]], ["Case charging", ["USB-C", "USB-C and wireless"]]],
    blurbs: ["Earbuds that stay put on a run and still sound good at a desk.", "A small pair of true wireless earbuds with a case that fits a jeans pocket."],
    uses: ["Pairs automatically when the case opens.", "Includes three sizes of ear tips and a short USB-C cable."],
  },
  {
    category: "audio", shape: "speaker", noun: "Portable Bluetooth Speaker", price: [25, 199], colors: NEUTRALS,
    mods: ["Waterproof", "Compact", "Pocket", "Party", "Outdoor"],
    features: ["360-degree sound from a passive-radiator design", "IP67 dust and water protection", "Pairs two speakers for stereo", "Built-in strap for a bag or bike", "USB-C charging that also powers a phone"],
    specs: [["Battery life", ["10 hours", "14 hours", "20 hours", "24 hours"]], ["Water resistance", ["IPX5", "IP67"]], ["Output power", ["10 W", "20 W", "30 W", "40 W"]], ["Weight", ["320 g", "540 g", "780 g", "1.1 kg"]]],
    blurbs: ["A rugged speaker that is happy outdoors and quiet enough indoors.", "Portable sound with more bass than its size suggests."],
    uses: ["Floats, survives a drop onto grass and keeps playing.", "Ships with a USB-C cable and a wrist strap."],
  },
  {
    category: "audio", shape: "speaker", noun: "Bookshelf Speakers", price: [99, 699], colors: ["Black", "Walnut", "White", "Oak"],
    mods: ["Powered", "Passive", "Reference", "Two-Way", "Compact"],
    features: ["Two-way design with a silk-dome tweeter", "Rear bass port tuned for small rooms", "Real wood-veneer cabinets", "Optical, USB and 3.5 mm inputs on the powered unit", "Magnetic cloth grilles"],
    specs: [["Woofer", ["4 in", "5 in", "6.5 in"]], ["Frequency response", ["55 Hz to 20 kHz", "48 Hz to 22 kHz", "42 Hz to 22 kHz"]], ["Amplification", ["Built-in, 2 x 50 W", "Built-in, 2 x 100 W", "Passive (needs an amplifier)"]], ["Dimensions", ["24 x 15 x 20 cm", "28 x 17 x 23 cm", "32 x 20 x 26 cm"]]],
    blurbs: ["A pair of bookshelf speakers for a desk, a shelf or a small living room.", "Warm, detailed stereo sound from a compact wood cabinet."],
    uses: ["Sold as a matched pair with speaker cable included.", "Works with a turntable, a TV or a computer."],
  },
  {
    category: "audio", shape: "box", noun: "USB DAC and Headphone Amp", price: [49, 499], colors: ["Black", "Silver"],
    mods: ["Desktop", "Portable", "Balanced", "Dual-Output"],
    features: ["32-bit converter with low-noise output stage", "Drives high-impedance headphones up to 600 ohm", "USB-C input with an optical output", "Gain switch for sensitive in-ears", "Aluminium chassis with a volume knob that feels weighted"],
    specs: [["Supported formats", ["PCM 384 kHz, DSD256", "PCM 192 kHz", "PCM 768 kHz, DSD512"]], ["Output power", ["200 mW at 32 ohm", "400 mW at 32 ohm", "1.5 W at 32 ohm"]], ["Inputs", ["USB-C", "USB-C, optical", "USB-C, optical, coaxial"]], ["Outputs", ["3.5 mm", "3.5 mm and 6.35 mm", "4.4 mm balanced and 6.35 mm"]]],
    blurbs: ["A small converter that makes a laptop sound like a proper source.", "Clean power for demanding headphones, without a rack of equipment."],
    uses: ["Plug in, select it as the output device and the difference is immediate.", "Includes a USB-C cable and rubber feet."],
  },

  // -------------------------------------------------------------- kitchen
  {
    category: "kitchen", shape: "dripper", noun: "Pour-Over Coffee Set", price: [24, 89], colors: ["White", "Black", "Stone", "Sand"],
    mods: ["Ceramic", "Glass", "Stainless", "Matte", "Double-Wall"],
    features: ["Ribbed cone for even extraction", "Heat-resistant carafe with graduations", "Fits standard number 2 cone filters", "Dishwasher safe", "Non-slip silicone base"],
    specs: [["Capacity", ["400 ml", "600 ml", "800 ml"]], ["Material", ["Glazed ceramic", "Borosilicate glass", "Stainless steel"]], ["Filter size", ["Cone #2", "Cone #4"]], ["Dishwasher safe", ["Yes", "Top rack only"]]],
    blurbs: ["A pour-over set with a dripper and a matching carafe.", "Brew a clean cup at home without any equipment you do not already own."],
    uses: ["Filters not included.", "The carafe stays stable on a counter and pours without dribbling."],
  },
  {
    category: "kitchen", shape: "mug", noun: "Stoneware Mug", price: [12, 59], colors: ["White", "Charcoal", "Sand", "Speckled"],
    mods: ["Speckled", "Double-Wall", "Reactive-Glaze", "Matte", "Handmade", "Everyday"],
    sizes: ["Set of 2", "Set of 4"],
    features: ["Thick walls that keep drinks warm", "Comfortable finger-width handle", "Microwave and dishwasher safe", "Stackable for small cupboards", "Lead-free glaze"],
    specs: [["Capacity (each)", ["300 ml", "350 ml", "400 ml"]], ["Material", ["Stoneware", "Porcelain"]], ["Microwave safe", ["Yes"]], ["Dishwasher safe", ["Yes"]]],
    blurbs: ["Mugs with weight and a glaze that is slightly different on each one.", "A set of everyday mugs that stack neatly."],
    uses: ["Tough enough for daily use.", "Packed in recycled card with no plastic."],
  },
  {
    category: "kitchen", shape: "board", noun: "Cutting Board", price: [18, 129], colors: [],
    mods: ["Walnut", "Maple", "Bamboo", "Acacia", "Oak", "End-Grain"],
    sizes: ["30 cm", "40 cm", "50 cm"],
    features: ["Juice groove around the edge", "Reversible with a flat serving side", "Finished with food-safe mineral oil", "Hand-grip cut-out for lifting", "Gentle on knife edges"],
    specs: [["Material", ["Walnut", "Maple", "Bamboo", "Acacia", "Oak"]], ["Thickness", ["20 mm", "30 mm", "38 mm"]], ["Care", ["Hand wash, oil monthly"]], ["Weight", ["900 g", "1.4 kg", "2.2 kg"]]],
    blurbs: ["A solid wood board for chopping and for bringing to the table.", "Cut on it every day; oil it now and then and it keeps its colour."],
    uses: ["Each board is a little different in grain and tone.", "Not dishwasher safe."],
  },
  {
    category: "kitchen", shape: "kettle", noun: "Gooseneck Kettle", price: [29, 179], colors: ["Black", "White", "Stainless", "Matte Grey"],
    mods: ["Electric", "Stovetop", "Ceramic", "Stainless", "Temperature-Control"],
    sizes: ["0.8 L", "1.0 L", "1.2 L"],
    features: ["Narrow spout for a steady, controlled pour", "Keep-warm mode holds the set temperature for 30 minutes", "Auto shut-off when it boils dry", "Counterbalanced handle", "Stainless steel interior"],
    specs: [["Capacity", ["0.8 L", "1.0 L", "1.2 L"]], ["Power", ["1000 W", "1200 W", "1500 W"]], ["Temperature range", ["40 to 100 C", "Boil only"]], ["Cord length", ["80 cm", "100 cm"]]],
    blurbs: ["A kettle that pours exactly where you point it.", "Built for pour-over coffee and loose-leaf tea."],
    uses: ["Heats quickly and is quiet.", "Comes with a one-year limited warranty."],
  },
  {
    category: "kitchen", shape: "bottle", noun: "Insulated Water Bottle", price: [17, 59], colors: NEUTRALS,
    mods: ["Stainless", "Vacuum", "Wide-Mouth", "Leak-Proof", "Powder-Coated"],
    sizes: ["500 ml", "750 ml", "1 L", "1.2 L"],
    features: ["Double-wall vacuum keeps drinks cold for 24 hours or hot for 12", "Leak-proof lid with a carry loop", "Fits most cup holders", "Powder coat that resists scratches", "BPA-free materials"],
    specs: [["Material", ["18/8 stainless steel"]], ["Cold retention", ["24 hours"]], ["Hot retention", ["12 hours"]], ["Mouth", ["Standard", "Wide (55 mm)"]]],
    blurbs: ["A bottle that keeps water cold through the afternoon.", "Insulated steel that goes from the desk to the trailhead."],
    uses: ["Hand wash the lid; the bottle is dishwasher safe.", "Available in a range of quiet colours."],
  },
  {
    category: "kitchen", shape: "bottle", noun: "Travel Tumbler", price: [14, 42], colors: NEUTRALS,
    mods: ["Insulated", "Stainless", "Slim", "Spill-Resistant"],
    sizes: ["350 ml", "470 ml", "600 ml"],
    features: ["Slide-lock lid reduces splashes", "Slim body fits a car cup holder", "Keeps coffee hot for 6 hours", "Easy-clean wide opening", "Silicone base for quiet desk use"],
    specs: [["Material", ["Stainless steel"]], ["Hot retention", ["6 hours", "8 hours"]], ["Lid", ["Slide lock", "Flip top"]], ["Weight", ["240 g", "290 g", "340 g"]]],
    blurbs: ["A tumbler for the walk to work.", "Holds a full coffee and does not drip in a bag."],
    uses: ["Dishwasher safe except the lid.", "Fits most under-the-spout machines."],
  },

  // ----------------------------------------------------------------- home
  {
    category: "home", shape: "throw", noun: "Throw Blanket", price: [29, 149], colors: ["Oat", "Charcoal", "Stone", "Navy", "Ivory"],
    mods: ["Linen", "Cotton", "Wool", "Knit", "Waffle", "Washed"],
    features: ["Soft, breathable fabric that gets better with washing", "Finished edges that do not fray", "Machine washable", "Generous size for a sofa or a bed", "Naturally temperature regulating"],
    specs: [["Material", ["Linen", "Cotton", "Wool blend", "Cotton knit"]], ["Size", ["130 x 170 cm", "150 x 200 cm", "127 x 152 cm"]], ["Weight", ["600 g", "900 g", "1.3 kg"]], ["Care", ["Machine wash cold", "Machine wash, tumble dry low"]]],
    blurbs: ["A throw that lives on the sofa and gets used.", "Soft without being heavy, in a colour that goes with most rooms."],
    uses: ["Folds small for storage.", "Wash it before first use for the softest feel."],
  },
  {
    category: "home", shape: "lamp", noun: "Table Lamp", price: [29, 199], colors: ["White", "Black", "Stone", "Brass"],
    mods: ["Ceramic", "Glass", "Brass-Finish", "Dimmable", "Linen-Shade"],
    features: ["Linen drum shade that diffuses light evenly", "In-line dimmer on the cord", "Stable weighted base", "Takes a standard E26 bulb (not included)", "Soft, warm light for reading"],
    specs: [["Height", ["38 cm", "45 cm", "52 cm", "60 cm"]], ["Bulb", ["E26, up to 60 W", "E26 LED, up to 9 W"]], ["Base material", ["Ceramic", "Glass", "Metal", "Wood"]], ["Cord length", ["1.5 m", "1.8 m"]]],
    blurbs: ["A lamp for a bedside, a shelf or a desk corner.", "Warm light and a quiet shape."],
    uses: ["Bulb not included.", "The dimmer is on the cord so you do not reach under the shade."],
  },
  {
    category: "home", shape: "candle", noun: "Soy Wax Candle", price: [12, 48], colors: [],
    mods: ["Cedar", "Sandalwood", "Fig", "Lavender", "Sea Salt", "Amber", "Vetiver", "Black Tea"],
    sizes: ["200 g", "300 g", "400 g"],
    features: ["Natural soy wax with a cotton wick", "Fragrance blended with essential oils", "Burns cleanly for up to 50 hours", "Reusable ceramic vessel", "Poured by hand in small batches"],
    specs: [["Wax", ["Soy"]], ["Burn time", ["40 hours", "50 hours", "60 hours"]], ["Weight", ["200 g", "300 g", "400 g"]], ["Wick", ["Cotton"]]],
    blurbs: ["A candle with a scent that fills a room without overpowering it.", "Hand-poured soy wax in a vessel you will keep."],
    uses: ["Trim the wick to 5 mm before each burn.", "Never leave a burning candle unattended."],
  },
  {
    category: "home", shape: "planter", noun: "Stoneware Planter", price: [14, 69], colors: ["White", "Charcoal", "Sand", "Terracotta Grey"],
    mods: ["Stoneware", "Matte", "Glazed", "Ribbed", "Tapered"],
    sizes: ["15 cm", "20 cm", "25 cm", "30 cm"],
    features: ["Drainage hole with a removable saucer", "Frost-resistant stoneware for patio use", "Wide, stable base", "Smooth interior for easy repotting", "Glaze finished by hand"],
    specs: [["Material", ["Stoneware"]], ["Diameter", ["15 cm", "20 cm", "25 cm", "30 cm"]], ["Drainage", ["Hole with saucer"]], ["Weight", ["600 g", "1.1 kg", "1.8 kg", "2.6 kg"]]],
    blurbs: ["A planter heavy enough to stay put and plain enough to suit any plant.", "Solid stoneware with a drainage hole and saucer."],
    uses: ["Suitable for indoor and sheltered outdoor use.", "Plants not included."],
  },
  {
    category: "home", shape: "lamp-floor", noun: "Floor Reading Lamp", price: [49, 269], colors: ["Black", "White", "Brass", "Graphite"],
    mods: ["Arc", "Adjustable", "Tripod", "Linen-Shade", "Slim"],
    features: ["Adjustable head points light exactly where you read", "Weighted base keeps it stable", "Foot switch for easy control", "Takes a standard E26 bulb (not included)", "Cable routed through the stem"],
    specs: [["Height", ["150 cm", "160 cm", "170 cm"]], ["Bulb", ["E26, up to 60 W", "E26 LED, up to 12 W"]], ["Finish", ["Powder-coated steel", "Brushed brass"]], ["Switch", ["Foot switch", "Dimmer dial"]]],
    blurbs: ["A floor lamp that earns its place next to the armchair.", "Slim in the corner, generous when you are reading."],
    uses: ["Assembles in minutes with the included tool.", "Bulb not included."],
  },

  // ----------------------------------------------------------------- desk
  {
    category: "desk", shape: "keyboard", noun: "Mechanical Keyboard", price: [49, 229], colors: ["Black", "White", "Grey"],
    mods: ["Compact", "Wireless", "Tenkeyless", "Low-Profile", "Hot-Swap", "75%"],
    features: ["Tactile switches with a controlled, quiet bump", "Hot-swappable sockets, no soldering needed", "Connects to three devices over Bluetooth or by cable", "PBT keycaps that do not shine with use", "Aluminium case with a gasket-mounted plate"],
    specs: [["Layout", ["65%", "75%", "Tenkeyless", "Full size"]], ["Switches", ["Tactile", "Linear", "Clicky"]], ["Connectivity", ["Bluetooth 5.1 and USB-C", "USB-C wired", "2.4 GHz, Bluetooth and USB-C"]], ["Battery", ["4000 mAh (up to 200 h)", "Wired only"]]],
    blurbs: ["A keyboard that feels good for eight hours a day.", "A compact layout that leaves room for the mouse."],
    uses: ["Works with macOS, Windows and Linux.", "Ships with a switch puller and a braided USB-C cable."],
  },
  {
    category: "desk", shape: "stand", noun: "Monitor Stand", price: [24, 119], colors: ["Walnut", "Black", "Silver", "Oak"],
    mods: ["Walnut", "Aluminium", "Bamboo", "Adjustable", "Drawer"],
    features: ["Raises the screen to eye level", "Storage space for a keyboard underneath", "Supports monitors up to 20 kg", "Non-slip feet protect the desk", "Cable cut-out at the back"],
    specs: [["Material", ["Walnut veneer", "Aluminium", "Bamboo", "Powder-coated steel"]], ["Load capacity", ["15 kg", "20 kg", "30 kg"]], ["Width", ["50 cm", "60 cm", "70 cm"]], ["Height", ["10 cm", "12 cm", "14 cm"]]],
    blurbs: ["A riser that puts the display where your neck wants it.", "Clears the desk by giving the keyboard a home under the screen."],
    uses: ["Assembly takes a couple of minutes.", "Fits laptops and most monitors."],
  },
  {
    category: "desk", shape: "mouse", noun: "Wireless Mouse", price: [15, 99], colors: ["Graphite", "Fog", "Black", "White"],
    mods: ["Ergonomic", "Silent", "Compact", "Rechargeable", "Multi-Device"],
    features: ["Quiet clicks that will not disturb a shared room", "Connects to two computers and switches with a button", "Precision sensor that works on glass", "Up to 70 days on a charge", "Side buttons for back and forward"],
    specs: [["Sensor", ["4000 DPI", "8000 DPI", "12000 DPI"]], ["Connectivity", ["Bluetooth 5.0", "2.4 GHz and Bluetooth"]], ["Battery life", ["70 days", "90 days", "4 months"]], ["Weight", ["82 g", "95 g", "110 g"]]],
    blurbs: ["A mouse that fits the hand and stays out of the way.", "Comfortable for long days and light enough to travel."],
    uses: ["USB receiver stores inside the mouse.", "Charges by USB-C."],
  },
  {
    category: "desk", shape: "mat", noun: "Desk Mat", price: [15, 89], colors: ["Charcoal", "Stone", "Black", "Oat"],
    mods: ["Felt", "Leather", "Wool", "Extended", "Reversible"],
    sizes: ["80 x 40 cm", "90 x 40 cm", "120 x 60 cm"],
    features: ["Smooth surface for mouse tracking", "Non-slip base grips the desk", "Protects wood from scratches and rings", "Water-resistant top layer", "Edges stitched to stop fraying"],
    specs: [["Material", ["Wool felt", "Vegan leather", "Merino wool"]], ["Size", ["80 x 40 cm", "90 x 40 cm", "120 x 60 cm"]], ["Thickness", ["3 mm", "4 mm", "5 mm"]], ["Base", ["Non-slip rubber"]]],
    blurbs: ["A mat that pulls the desk together.", "Soft under the wrists and good for the mouse."],
    uses: ["Wipe clean with a damp cloth.", "Ships rolled; lay flat for a day."],
  },
  {
    category: "desk", shape: "box", noun: "USB-C Dock", price: [29, 219], colors: ["Silver", "Space Grey"],
    mods: ["6-in-1", "8-in-1", "11-in-1", "Compact", "Dual-Monitor"],
    features: ["HDMI output supporting 4K at 60 Hz", "Pass-through charging up to 100 W", "Gigabit Ethernet for a stable connection", "SD and microSD card readers", "Aluminium case that stays cool"],
    specs: [["Ports", ["6-in-1 (6 ports)", "8-in-1 (8 ports)", "11-in-1 (11 ports)"]], ["Video", ["1 x HDMI 4K60", "2 x HDMI 4K30", "HDMI and DisplayPort"]], ["Power delivery", ["Up to 85 W", "Up to 100 W"]], ["Ethernet", ["Gigabit", "None"]]],
    blurbs: ["One cable turns a thin laptop into a full workstation.", "A dock that handles the display, the network and the charger."],
    uses: ["Works with USB-C and Thunderbolt 3/4 laptops and tablets.", "Cable attached, so there is nothing to lose."],
  },
  {
    category: "desk", shape: "stand", noun: "Laptop Stand", price: [19, 89], colors: ["Silver", "Space Grey", "Black"],
    mods: ["Aluminium", "Foldable", "Adjustable", "Portable", "Ventilated"],
    features: ["Six height settings from 15 to 30 degrees", "Folds flat for a bag", "Open design lets heat escape", "Silicone grips protect the laptop", "Holds laptops from 10 to 17 inches"],
    specs: [["Material", ["Aluminium alloy"]], ["Load capacity", ["5 kg", "8 kg", "10 kg"]], ["Weight", ["220 g", "340 g", "480 g"]], ["Adjustment", ["6 angles", "Continuous"]]],
    blurbs: ["A stand that lifts the screen and cools the laptop.", "Light enough to carry and sturdy enough to trust."],
    uses: ["Pair it with an external keyboard for a better posture.", "Folds in seconds."],
  },

  // --------------------------------------------------------------- travel
  {
    category: "travel", shape: "backpack", noun: "Everyday Backpack", price: [39, 189], colors: ["Black", "Stone", "Navy", "Olive"],
    mods: ["Water-Resistant", "Commuter", "Minimalist", "Roll-Top", "Padded"],
    sizes: ["18 L", "22 L", "28 L", "32 L"],
    features: ["Padded sleeve fits a 16-inch laptop", "Water-resistant recycled fabric", "Quick-access pocket for a phone or passport", "Chest strap stows away when not needed", "Luggage strap slides over a suitcase handle"],
    specs: [["Capacity", ["18 L", "22 L", "28 L", "32 L"]], ["Laptop sleeve", ["Up to 14 in", "Up to 16 in", "Up to 17 in"]], ["Material", ["Recycled nylon", "Waxed canvas", "Recycled polyester"]], ["Weight", ["650 g", "820 g", "1.0 kg"]]],
    blurbs: ["A backpack that works for the commute and the weekend.", "Plain on the outside and well organised inside."],
    uses: ["Zips and webbing tested for daily use.", "Backed by a two-year warranty."],
  },
  {
    category: "travel", shape: "cubes", noun: "Packing Cubes", price: [15, 59], colors: ["Black", "Stone", "Navy", "Sage"],
    mods: ["Compression", "Lightweight", "Mesh-Top", "Ripstop"],
    sizes: ["Set of 3", "Set of 4", "Set of 6"],
    features: ["Different sizes for shirts, trousers and small items", "Mesh panel shows what is inside", "Zips that glide and do not snag", "Compression zip saves space", "Light enough to forget about"],
    specs: [["Pieces", ["3", "4", "6"]], ["Material", ["Ripstop nylon", "Recycled polyester"]], ["Largest cube", ["40 x 30 x 12 cm", "45 x 32 x 14 cm"]], ["Weight", ["180 g", "260 g", "380 g"]]],
    blurbs: ["Cubes that make a suitcase feel organised.", "Pack by type, unpack in a minute."],
    uses: ["Machine washable.", "Fit a carry-on without wasted space."],
  },
  {
    category: "travel", shape: "wallet", noun: "Passport Wallet", price: [19, 89], colors: ["Black", "Tan", "Navy", "Olive"],
    mods: ["Leather", "Slim", "RFID-Blocking", "Zip", "Vegetable-Tanned"],
    features: ["Holds a passport, boarding passes and cards", "RFID-blocking lining", "Pen loop and a hidden note pocket", "Soft leather that develops character", "Slim enough for a jacket pocket"],
    specs: [["Material", ["Full-grain leather", "Vegetable-tanned leather"]], ["Card slots", ["4", "6", "8"]], ["Dimensions", ["14 x 10 cm", "15 x 11 cm"]], ["RFID protection", ["Yes"]]],
    blurbs: ["One wallet for the documents that matter on a trip.", "Keeps a passport and the paperwork in one place."],
    uses: ["Leather darkens gently with use.", "Gift boxed."],
  },
  {
    category: "travel", shape: "suitcase", noun: "Carry-On Suitcase", price: [79, 329], colors: ["Black", "Graphite", "Stone", "Navy"],
    mods: ["Hardshell", "Spinner", "Expandable", "Lightweight", "Polycarbonate"],
    sizes: ["34 L", "38 L", "42 L"],
    features: ["Impact-resistant polycarbonate shell", "Quiet 360-degree spinner wheels", "TSA-approved combination lock", "Two-stage telescoping handle", "Interior compression straps and zip divider"],
    specs: [["Capacity", ["34 L", "38 L", "42 L"]], ["Dimensions", ["55 x 35 x 23 cm", "55 x 36 x 23 cm", "55 x 38 x 25 cm"]], ["Weight", ["2.5 kg", "2.9 kg", "3.2 kg"]], ["Shell", ["Polycarbonate", "ABS and polycarbonate"]]],
    blurbs: ["A carry-on that fits overhead on most airlines.", "Hard shell outside, organised inside."],
    uses: ["Check your airline's size limits before you fly.", "Backed by a five-year warranty."],
  },
  {
    category: "travel", shape: "box", noun: "Universal Travel Adapter", price: [15, 69], colors: ["White", "Black"],
    mods: ["GaN", "Compact", "Fast-Charge", "All-in-One", "Slim"],
    features: ["Works in over 150 countries", "Two USB-C ports with fast charging", "Built-in fuse protection", "Slide-out plugs, nothing to lose", "Compact enough for a pocket"],
    specs: [["Plug types", ["A, C, G, I", "A, C, G, I and E/F"]], ["USB-C output", ["30 W", "45 W", "65 W"]], ["Ports", ["2 USB-C and 2 USB-A", "2 USB-C", "3 USB-A and 1 USB-C"]], ["Input voltage", ["100 to 250 V"]]],
    blurbs: ["A single adapter for every country on the itinerary.", "Charges a laptop and a phone from one socket."],
    uses: ["Not a voltage converter for non-dual-voltage appliances.", "Fits in a coat pocket."],
  },
  {
    category: "travel", shape: "backpack", noun: "Weekender Duffel", price: [49, 199], colors: ["Black", "Olive", "Stone", "Navy"],
    mods: ["Waxed", "Convertible", "Water-Resistant", "Carry-On"],
    sizes: ["30 L", "40 L", "50 L"],
    features: ["Converts between handles, a shoulder strap and backpack straps", "Shoe compartment with a ventilated panel", "Wide opening for easy packing", "Reinforced base", "Fits under most airline seats"],
    specs: [["Capacity", ["30 L", "40 L", "50 L"]], ["Material", ["Waxed canvas", "Recycled nylon"]], ["Weight", ["900 g", "1.2 kg", "1.5 kg"]], ["Straps", ["Backpack and shoulder", "Shoulder only"]]],
    blurbs: ["A duffel for two nights away.", "Soft enough to squeeze into a boot, tough enough to be thrown into one."],
    uses: ["The waxed finish sheds rain.", "Includes a removable shoulder pad."],
  },

  // ------------------------------------------------------------ wearables
  {
    category: "wearables", shape: "watch", noun: "Field Watch", price: [49, 499], colors: ["Canvas", "Steel", "Black", "Brown"],
    mods: ["Quartz", "Solar", "Titanium", "Automatic", "Sapphire"],
    sizes: ["38 mm", "40 mm", "42 mm"],
    features: ["Sapphire-coated crystal resists scratches", "Luminous hands and markers", "Interchangeable strap with quick-release pins", "Water resistant to 100 m", "Simple, legible dial"],
    specs: [["Case size", ["38 mm", "40 mm", "42 mm"]], ["Movement", ["Quartz", "Solar quartz", "Automatic"]], ["Water resistance", ["50 m", "100 m", "200 m"]], ["Case material", ["Stainless steel", "Titanium"]]],
    blurbs: ["A watch that tells the time clearly and goes with everything.", "Classic field-watch proportions in a case that wears small."],
    uses: ["Set it once and forget it.", "Comes in a tin with a spare strap."],
  },
  {
    category: "wearables", shape: "band", noun: "Fitness Band", price: [25, 129], colors: ["Black", "Slate", "Stone", "Navy"],
    mods: ["Slim", "Waterproof", "Heart-Rate", "Sleep-Tracking", "Lightweight"],
    features: ["Tracks steps, heart rate and sleep", "Up to 14 days between charges", "Water resistant for swimming", "Smartphone notifications on the wrist", "Bright AMOLED display"],
    specs: [["Battery life", ["10 days", "14 days", "21 days"]], ["Water resistance", ["5 ATM"]], ["Display", ["1.1 in AMOLED", "1.47 in AMOLED"]], ["Sensors", ["Heart rate, SpO2, accelerometer", "Heart rate, accelerometer"]]],
    blurbs: ["A light band that handles the basics well.", "Tracks activity without demanding attention."],
    uses: ["Pairs with iOS and Android.", "Charges with a magnetic cable."],
  },
  {
    category: "wearables", shape: "watch", noun: "Smartwatch", price: [99, 449], colors: ["Black", "Silver", "Stone"],
    mods: ["GPS", "Sport", "Always-On", "Titanium", "Solar"],
    sizes: ["41 mm", "45 mm"],
    features: ["Built-in GPS for runs and rides", "Always-on display that stays readable in sunlight", "Heart-rate and sleep tracking", "Contactless payments on supported phones", "Up to 7 days of battery"],
    specs: [["Case size", ["41 mm", "45 mm"]], ["Battery life", ["5 days", "7 days", "10 days"]], ["Navigation", ["GPS", "GPS and GLONASS"]], ["Water resistance", ["5 ATM", "10 ATM"]]],
    blurbs: ["A smartwatch that does the useful things and leaves the rest.", "Training, notifications and payments on the wrist."],
    uses: ["Works with iOS and Android.", "Charging dock included."],
  },
  {
    category: "wearables", shape: "sunglasses", noun: "Polarized Sunglasses", price: [19, 159], colors: ["Black", "Tortoise", "Grey", "Crystal"],
    mods: ["Aviator", "Square", "Round", "Classic", "Lightweight"],
    features: ["Polarized lenses cut glare from water and roads", "100 percent UV400 protection", "Spring hinges for a comfortable fit", "Scratch-resistant coating", "Hard case and cloth included"],
    specs: [["Lens", ["Polarized polycarbonate", "Polarized glass"]], ["UV protection", ["UV400"]], ["Frame", ["Acetate", "Metal", "TR90 nylon"]], ["Lens width", ["52 mm", "54 mm", "58 mm"]]],
    blurbs: ["Sunglasses with clear, glare-free lenses.", "A frame shape that suits more faces than it should."],
    uses: ["Case and cleaning cloth included.", "Backed by a one-year warranty."],
  },
  {
    category: "wearables", shape: "beanie", noun: "Wool Beanie", price: [14, 59], colors: ["Charcoal", "Oat", "Navy", "Black", "Stone"],
    mods: ["Merino", "Ribbed", "Cashmere-Blend", "Fleece-Lined", "Cuffed"],
    features: ["Soft against the skin, no itch", "Stretches to fit most heads", "Warm without being bulky", "Machine washable on a wool cycle", "Double-layer knit"],
    specs: [["Material", ["100 percent merino wool", "Merino and nylon", "Wool and cashmere blend"]], ["Size", ["One size"]], ["Care", ["Wool cycle, lay flat to dry"]], ["Fit", ["Fitted", "Slouchy"]]],
    blurbs: ["A beanie that does the job in cold weather.", "Soft merino knit that does not scratch."],
    uses: ["Packs flat in a pocket.", "Colours chosen to match a coat."],
  },
  {
    category: "wearables", shape: "wallet", noun: "Leather Card Holder", price: [14, 69], colors: ["Black", "Tan", "Navy", "Olive"],
    mods: ["Slim", "Zip", "RFID-Blocking", "Full-Grain", "Minimalist"],
    features: ["Holds up to six cards and folded notes", "Slim 6 mm profile", "Full-grain leather", "RFID-blocking lining", "Thumb cut-out for easy access"],
    specs: [["Material", ["Full-grain leather", "Vegetable-tanned leather"]], ["Card capacity", ["4", "6", "8"]], ["Dimensions", ["10 x 7 cm", "11 x 8 cm"]], ["RFID protection", ["Yes", "No"]]],
    blurbs: ["A card holder for people who dislike a bulky pocket.", "Carries what you need and nothing more."],
    uses: ["Leather softens with use.", "Gift boxed."],
  },
];
