import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  // Clear existing data in reverse dependency order
  await prisma.checkIn.deleteMany();
  await prisma.feePaymentLine.deleteMany();
  await prisma.feePayment.deleteMany();
  await prisma.review.deleteMany();
  await prisma.savedBusiness.deleteMany();
  await prisma.systemLog.deleteMany();
  await prisma.event.deleteMany();
  await prisma.verifierProfile.deleteMany();
  await prisma.adminAccess.deleteMany();
  await prisma.business.deleteMany();
  await prisma.tourismCircuit.deleteMany();
  await prisma.user.deleteMany();

  console.log("Cleared existing data.");

  // ============================================================
  // 1. DEMO ACCOUNTS
  // ============================================================
  const passwordHash = await bcrypt.hash("Demo2026!", 12);

  const tourist1 = await prisma.user.create({
    data: {
      email: "tourist@demo.zircuvia.ph",
      passwordHash,
      firstName: "Maria",
      lastName: "Santos",
      role: "TOURIST",
      emailVerified: true,
    },
  });

  const tourist2 = await prisma.user.create({
    data: {
      email: "tourist2@demo.zircuvia.ph",
      passwordHash,
      firstName: "Juan",
      lastName: "Dela Cruz",
      role: "TOURIST",
      emailVerified: true,
    },
  });

  const admin = await prisma.user.create({
    data: {
      email: "admin@demo.zircuvia.ph",
      passwordHash,
      firstName: "Admin",
      lastName: "User",
      role: "ADMIN",
      emailVerified: true,
    },
  });

  await prisma.adminAccess.create({
    data: {
      userId: admin.id,
      businessManagement: true,
      ecoBusinessProcessing: true,
      environmentalFees: true,
      visitorStats: true,
      eventsAndPromos: true,
      systemLogs: true,
      settings: true,
    },
  });

  const verifier = await prisma.user.create({
    data: {
      email: "verifier@demo.zircuvia.ph",
      passwordHash,
      firstName: "Pedro",
      lastName: "Reyes",
      role: "VERIFIER",
      emailVerified: true,
    },
  });

  console.log("Created demo accounts.");

  // ============================================================
  // 2. TOURISM CIRCUITS
  // ============================================================
  const circuits = await Promise.all([
    prisma.tourismCircuit.create({
      data: {
        name: "City Core & Heritage",
        cluster: "Puerto Princesa City Core",
        thematicConcept: "Urban heritage meets smart tourism",
      },
    }),
    prisma.tourismCircuit.create({
      data: {
        name: "Underground River & Karst",
        cluster: "Sabang-St. Paul Area",
        thematicConcept: "Subterranean wonders and karst landscape",
      },
    }),
    prisma.tourismCircuit.create({
      data: {
        name: "Bay & Coastal",
        cluster: "Honda Bay & Coastal Zone",
        thematicConcept: "Island hopping and marine biodiversity",
      },
    }),
    prisma.tourismCircuit.create({
      data: {
        name: "Eco-Adventure & Uplands",
        cluster: "Inland Eco-Adventure Zone",
        thematicConcept: "Jungle trails and adventure activities",
      },
    }),
    prisma.tourismCircuit.create({
      data: {
        name: "Southern Cultural",
        cluster: "South Road Corridor",
        thematicConcept: "Indigenous culture and agri-tourism",
      },
    }),
    prisma.tourismCircuit.create({
      data: {
        name: "Northern Gateway",
        cluster: "North Road Communities",
        thematicConcept: "Community-based tourism",
      },
    }),
  ]);

  const [cityCore, undergroundRiver, bayCoastal, ecoAdventure, southernCultural, northernGateway] = circuits;

  console.log("Created tourism circuits.");

  // ============================================================
  // 3. BUSINESSES
  // ============================================================

  // --- Hotels (8) ---
  const hotels = await Promise.all([
    prisma.business.create({
      data: {
        name: "Hue Hotels and Resorts Puerto Princesa",
        category: "HOTEL",
        about: "Modern lifestyle hotel in the heart of Puerto Princesa with rooftop pool and restaurant.",
        address: "San Pedro, Puerto Princesa City",
        barangay: "San Pedro",
        lat: 9.7397,
        lng: 118.7350,
        phone: "(048) 434-7777",
        website: "https://huehotels.com",
        owner: "Hue Hotels & Resorts Inc.",
        isEcoCertified: true,
        ecoStatus: "APPROVED",
        circuitId: cityCore.id,
      },
    }),
    prisma.business.create({
      data: {
        name: "Best Western Plus The Ivywall Hotel",
        category: "HOTEL",
        about: "International-standard hotel offering comfortable rooms and excellent service near the city center.",
        address: "Rizal Avenue, Puerto Princesa City",
        barangay: "Bancao-Bancao",
        lat: 9.7465,
        lng: 118.7380,
        phone: "(048) 434-5678",
        website: "https://bestwestern.com",
        circuitId: cityCore.id,
      },
    }),
    prisma.business.create({
      data: {
        name: "Aziza Paradise Hotel",
        category: "HOTEL",
        about: "Boutique hotel with lush tropical garden setting and warm Palawan hospitality.",
        address: "Rizal Avenue, Puerto Princesa City",
        barangay: "Bancao-Bancao",
        lat: 9.7480,
        lng: 118.7370,
        phone: "(048) 433-2631",
        isEcoCertified: true,
        ecoStatus: "APPROVED",
        circuitId: cityCore.id,
      },
    }),
    prisma.business.create({
      data: {
        name: "Hotel Centro",
        category: "HOTEL",
        about: "Centrally located hotel perfect for business and leisure travelers exploring the city.",
        address: "Junction 1, San Miguel, Puerto Princesa City",
        barangay: "San Miguel",
        lat: 9.7505,
        lng: 118.7415,
        phone: "(048) 723-9888",
        circuitId: cityCore.id,
      },
    }),
    prisma.business.create({
      data: {
        name: "Canvas Boutique Hotel",
        category: "HOTEL",
        about: "Art-inspired boutique hotel with contemporary design and personalized service.",
        address: "Rizal Avenue, Puerto Princesa City",
        barangay: "Bancao-Bancao",
        lat: 9.7475,
        lng: 118.7365,
        phone: "(048) 434-8888",
        circuitId: cityCore.id,
      },
    }),
    prisma.business.create({
      data: {
        name: "Go Hotels Puerto Princesa",
        category: "HOTEL",
        about: "Affordable and comfortable hotel chain offering clean rooms and essential amenities.",
        address: "Robinsons Place Palawan, Puerto Princesa City",
        barangay: "San Pedro",
        lat: 9.7390,
        lng: 118.7340,
        circuitId: cityCore.id,
      },
    }),
    prisma.business.create({
      data: {
        name: "Citystate Asturias Hotel",
        category: "HOTEL",
        about: "Mid-range hotel with modern facilities, swimming pool, and conference rooms.",
        address: "National Highway, Puerto Princesa City",
        barangay: "San Manuel",
        lat: 9.7520,
        lng: 118.7430,
        phone: "(048) 434-3333",
        circuitId: cityCore.id,
      },
    }),
    prisma.business.create({
      data: {
        name: "Palawan Uno Hotel",
        category: "HOTEL",
        about: "Budget-friendly hotel with spacious rooms near the airport and city attractions.",
        address: "Malvar Street, Puerto Princesa City",
        barangay: "Bancao-Bancao",
        lat: 9.7460,
        lng: 118.7355,
        circuitId: cityCore.id,
      },
    }),
  ]);

  // --- Resorts (5) ---
  const resorts = await Promise.all([
    prisma.business.create({
      data: {
        name: "Astoria Palawan",
        category: "RESORT",
        about: "Beachfront resort offering world-class amenities and water activities in Puerto Princesa.",
        address: "Brgy. Bancao-Bancao, Puerto Princesa City",
        barangay: "Bancao-Bancao",
        lat: 9.7250,
        lng: 118.7450,
        phone: "(048) 434-1888",
        website: "https://astoriapalawan.com",
        isEcoCertified: true,
        ecoStatus: "APPROVED",
        circuitId: bayCoastal.id,
      },
    }),
    prisma.business.create({
      data: {
        name: "Costa Palawan Resort",
        category: "RESORT",
        about: "Eco-resort nestled along the coast with stunning sea views and sustainable practices.",
        address: "Brgy. Langogan, Puerto Princesa City",
        barangay: "Langogan",
        lat: 9.8050,
        lng: 118.7900,
        phone: "(048) 434-2500",
        circuitId: bayCoastal.id,
      },
    }),
    prisma.business.create({
      data: {
        name: "Princesa Garden Island Resort & Spa",
        category: "RESORT",
        about: "Luxury island resort with private beach, spa, and fine dining experiences.",
        address: "Brgy. Bancao-Bancao, Puerto Princesa City",
        barangay: "Bancao-Bancao",
        lat: 9.7230,
        lng: 118.7420,
        phone: "(048) 434-9000",
        website: "https://princesagardenisland.com",
        circuitId: bayCoastal.id,
      },
    }),
    prisma.business.create({
      data: {
        name: "Microtel by Wyndham Puerto Princesa",
        category: "RESORT",
        about: "Modern resort-style hotel with pool and garden in a convenient location.",
        address: "San Pedro, Puerto Princesa City",
        barangay: "San Pedro",
        lat: 9.7395,
        lng: 118.7345,
        phone: "(048) 434-6868",
        circuitId: cityCore.id,
      },
    }),
    prisma.business.create({
      data: {
        name: "Daluyon Beach and Mountain Resort",
        category: "RESORT",
        about: "Award-winning eco-resort near the Underground River with beachfront and mountain backdrop.",
        address: "Brgy. Sabang, Puerto Princesa City",
        barangay: "Sabang",
        lat: 10.1820,
        lng: 118.8960,
        phone: "(048) 723-0505",
        website: "https://daluyon.com",
        isEcoCertified: true,
        ecoStatus: "APPROVED",
        circuitId: undergroundRiver.id,
      },
    }),
  ]);

  // --- Restaurants (10) ---
  const restaurants = await Promise.all([
    prisma.business.create({
      data: {
        name: "Badjao Seafront Restaurant",
        category: "RESTAURANT",
        about: "Iconic waterfront restaurant offering fresh seafood with stunning sunset views over the bay.",
        address: "Abueg Road, Brgy. San Miguel, Puerto Princesa City",
        barangay: "San Miguel",
        lat: 9.7580,
        lng: 118.7330,
        phone: "(048) 434-9461",
        isEcoCertified: true,
        ecoStatus: "APPROVED",
        circuitId: cityCore.id,
      },
    }),
    prisma.business.create({
      data: {
        name: "KaLui Restaurant",
        category: "RESTAURANT",
        about: "Fine dining Filipino restaurant known for set-course meals and art gallery ambiance.",
        address: "369 Rizal Avenue, Puerto Princesa City",
        barangay: "Bancao-Bancao",
        lat: 9.7470,
        lng: 118.7375,
        phone: "(048) 433-2580",
        circuitId: cityCore.id,
      },
    }),
    prisma.business.create({
      data: {
        name: "Bakers Kitchen",
        category: "RESTAURANT",
        about: "Popular bakery and restaurant serving Filipino comfort food and fresh pastries.",
        address: "Rizal Avenue, Puerto Princesa City",
        barangay: "Bancao-Bancao",
        lat: 9.7468,
        lng: 118.7360,
        circuitId: cityCore.id,
      },
    }),
    prisma.business.create({
      data: {
        name: "La Terrasse",
        category: "RESTAURANT",
        about: "European-inspired restaurant with rooftop dining and an extensive wine selection.",
        address: "Rizal Avenue, Puerto Princesa City",
        barangay: "San Pedro",
        lat: 9.7400,
        lng: 118.7355,
        circuitId: cityCore.id,
      },
    }),
    prisma.business.create({
      data: {
        name: "Bernardo's Restaurant",
        category: "RESTAURANT",
        about: "Home-style Filipino cuisine in a cozy garden setting, perfect for family dining.",
        address: "National Highway, Puerto Princesa City",
        barangay: "San Manuel",
        lat: 9.7530,
        lng: 118.7440,
        circuitId: cityCore.id,
      },
    }),
    prisma.business.create({
      data: {
        name: "Happy Husky Cafe",
        category: "RESTAURANT",
        about: "Trendy pet-friendly cafe with specialty coffee, artisan sandwiches, and resident huskies.",
        address: "Rizal Avenue, Puerto Princesa City",
        barangay: "Bancao-Bancao",
        lat: 9.7472,
        lng: 118.7362,
        circuitId: cityCore.id,
      },
    }),
    prisma.business.create({
      data: {
        name: "Cacaoyan Forest Park Restaurant",
        category: "RESTAURANT",
        about: "Nature-themed dining surrounded by tropical trees, serving organic Palawan dishes.",
        address: "Brgy. Irawan, Puerto Princesa City",
        barangay: "Irawan",
        lat: 9.7200,
        lng: 118.7500,
        ecoStatus: "PENDING",
        circuitId: ecoAdventure.id,
      },
    }),
    prisma.business.create({
      data: {
        name: "Cafemoto",
        category: "RESTAURANT",
        about: "Motorcycle-themed cafe popular with riders and adventure seekers, great coffee and burgers.",
        address: "National Highway, Puerto Princesa City",
        barangay: "San Manuel",
        lat: 9.7535,
        lng: 118.7445,
        circuitId: cityCore.id,
      },
    }),
    prisma.business.create({
      data: {
        name: "Divine Sweets Cafe",
        category: "RESTAURANT",
        about: "Charming dessert cafe featuring homemade cakes, pastries, and refreshing fruit drinks.",
        address: "Rizal Avenue, Puerto Princesa City",
        barangay: "Bancao-Bancao",
        lat: 9.7462,
        lng: 118.7358,
        circuitId: cityCore.id,
      },
    }),
    prisma.business.create({
      data: {
        name: "Acacia Tree Garden Dining",
        category: "RESTAURANT",
        about: "Open-air garden restaurant under century-old acacia trees, specializing in grilled seafood.",
        address: "National Highway, Puerto Princesa City",
        barangay: "San Manuel",
        lat: 9.7540,
        lng: 118.7450,
        circuitId: cityCore.id,
      },
    }),
  ]);

  // --- Artisans (5) ---
  const artisans = await Promise.all([
    prisma.business.create({
      data: {
        name: "Kaingud Arts & Crafts",
        category: "ARTISAN",
        about: "Indigenous Palawan artisan workshop creating traditional woven crafts and beadwork.",
        address: "Rizal Avenue, Puerto Princesa City",
        barangay: "Bancao-Bancao",
        lat: 9.7478,
        lng: 118.7368,
        circuitId: cityCore.id,
      },
    }),
    prisma.business.create({
      data: {
        name: "Amaza Pearls",
        category: "ARTISAN",
        about: "Premium South Sea pearl jewelry shop showcasing Palawan's finest cultured pearls.",
        address: "Rizal Avenue, Puerto Princesa City",
        barangay: "Bancao-Bancao",
        lat: 9.7474,
        lng: 118.7372,
        circuitId: cityCore.id,
      },
    }),
    prisma.business.create({
      data: {
        name: "Palawan Treasures",
        category: "ARTISAN",
        about: "Curated souvenir shop offering locally made crafts, cashew products, and Palawan delicacies.",
        address: "Junction 1, Puerto Princesa City",
        barangay: "San Miguel",
        lat: 9.7510,
        lng: 118.7420,
        circuitId: cityCore.id,
      },
    }),
    prisma.business.create({
      data: {
        name: "View Deck Magayen Souvenir Shop",
        category: "ARTISAN",
        about: "Scenic viewpoint and souvenir shop with local handicrafts and panoramic bay views.",
        address: "Brgy. Magayen, Puerto Princesa City",
        barangay: "Magayen",
        lat: 9.7600,
        lng: 118.7280,
        ecoStatus: "PENDING",
        circuitId: bayCoastal.id,
      },
    }),
    prisma.business.create({
      data: {
        name: "WW2 Memorial Museum Souvenir Shop",
        category: "ARTISAN",
        about: "Historical souvenir shop at the WWII memorial, offering books and memorabilia.",
        address: "National Highway, Puerto Princesa City",
        barangay: "San Pedro",
        lat: 9.7385,
        lng: 118.7338,
        circuitId: cityCore.id,
      },
    }),
  ]);

  // --- Travel & Tours (5) ---
  const travelTours = await Promise.all([
    prisma.business.create({
      data: {
        name: "7 Wonders Travel & Tours",
        category: "TRAVEL_AND_TOURS",
        about: "Full-service travel agency offering Underground River, Honda Bay, and El Nido tours.",
        address: "Rizal Avenue, Puerto Princesa City",
        barangay: "Bancao-Bancao",
        lat: 9.7466,
        lng: 118.7363,
        phone: "(048) 434-1234",
        circuitId: cityCore.id,
      },
    }),
    prisma.business.create({
      data: {
        name: "Dolphin and Whales Watching Tours",
        category: "TRAVEL_AND_TOURS",
        about: "Specialized eco-tourism operator for dolphin and whale watching expeditions.",
        address: "Brgy. Sta. Lourdes, Puerto Princesa City",
        barangay: "Sta. Lourdes",
        lat: 9.8200,
        lng: 118.7600,
        circuitId: bayCoastal.id,
      },
    }),
    prisma.business.create({
      data: {
        name: "El Taraw Tours",
        category: "TRAVEL_AND_TOURS",
        about: "Adventure tour operator specializing in island hopping, Taraw cliff climbing, and diving.",
        address: "Rizal Avenue, Puerto Princesa City",
        barangay: "Bancao-Bancao",
        lat: 9.7471,
        lng: 118.7367,
        circuitId: cityCore.id,
      },
    }),
    prisma.business.create({
      data: {
        name: "Exploring Bearcat Nature Tours",
        category: "TRAVEL_AND_TOURS",
        about: "Eco-adventure tour operator focused on wildlife encounters and nature treks.",
        address: "National Highway, Puerto Princesa City",
        barangay: "San Manuel",
        lat: 9.7525,
        lng: 118.7435,
        circuitId: ecoAdventure.id,
      },
    }),
    prisma.business.create({
      data: {
        name: "Halika Tours & Travel",
        category: "TRAVEL_AND_TOURS",
        about: "Friendly tour operator offering customized Palawan itineraries and transportation services.",
        address: "San Pedro, Puerto Princesa City",
        barangay: "San Pedro",
        lat: 9.7392,
        lng: 118.7342,
        circuitId: cityCore.id,
      },
    }),
  ]);

  // --- Tour Destinations (18) ---
  const tourDestinations = await Promise.all([
    prisma.business.create({
      data: {
        name: "Sabang Waterfalls",
        category: "TOUR",
        about: "Majestic multi-tiered waterfall nestled in the Sabang jungle, perfect for nature lovers.",
        address: "Brgy. Sabang, Puerto Princesa City",
        barangay: "Sabang",
        lat: 10.1800,
        lng: 118.8950,
        circuitId: undergroundRiver.id,
      },
    }),
    prisma.business.create({
      data: {
        name: "Sabang Sea Ferry Terminal",
        category: "TOUR",
        about: "Gateway to the Puerto Princesa Underground River, with boat tours departing daily.",
        address: "Sabang Wharf, Brgy. Sabang, Puerto Princesa City",
        barangay: "Sabang",
        lat: 10.1850,
        lng: 118.8980,
        circuitId: undergroundRiver.id,
      },
    }),
    prisma.business.create({
      data: {
        name: "Sabang Mangrove Paddle Boat Tour",
        category: "TOUR",
        about: "Guided paddle boat tour through pristine mangrove forests teeming with wildlife.",
        address: "Sabang River, Brgy. Sabang, Puerto Princesa City",
        barangay: "Sabang",
        lat: 10.1830,
        lng: 118.8940,
        circuitId: undergroundRiver.id,
      },
    }),
    prisma.business.create({
      data: {
        name: "Sabang Jungle Trail",
        category: "TOUR",
        about: "3.5km jungle trek through old-growth forest with wildlife spotting opportunities.",
        address: "Brgy. Sabang, Puerto Princesa City",
        barangay: "Sabang",
        lat: 10.1840,
        lng: 118.8920,
        circuitId: undergroundRiver.id,
      },
    }),
    prisma.business.create({
      data: {
        name: "Ugong Rock Adventures",
        category: "TOUR",
        about: "Spelunking and zip-line adventure atop a unique karst limestone formation.",
        address: "Brgy. Tagabinet, Puerto Princesa City",
        barangay: "Tagabinet",
        lat: 10.1500,
        lng: 118.8700,
        circuitId: undergroundRiver.id,
      },
    }),
    prisma.business.create({
      data: {
        name: "Hundred Caves",
        category: "TOUR",
        about: "Network of cave systems with dramatic stalactite and stalagmite formations.",
        address: "Brgy. Tagabinet, Puerto Princesa City",
        barangay: "Tagabinet",
        lat: 10.1480,
        lng: 118.8680,
        circuitId: undergroundRiver.id,
      },
    }),
    prisma.business.create({
      data: {
        name: "Buenavista Viewdeck",
        category: "TOUR",
        about: "Panoramic viewpoint overlooking Ulugan Bay and the surrounding mountain ranges.",
        address: "Brgy. Tagabinet, Puerto Princesa City",
        barangay: "Tagabinet",
        lat: 10.1550,
        lng: 118.8650,
        circuitId: undergroundRiver.id,
      },
    }),
    prisma.business.create({
      data: {
        name: "Batak Visitor Center",
        category: "TOUR",
        about: "Cultural center showcasing the heritage and traditions of the Batak indigenous people.",
        address: "Brgy. Tanabag, Puerto Princesa City",
        barangay: "Tanabag",
        lat: 10.0800,
        lng: 118.8200,
        circuitId: southernCultural.id,
      },
    }),
    prisma.business.create({
      data: {
        name: "Taraw Cave",
        category: "TOUR",
        about: "Limestone cave system with impressive rock formations and underground streams.",
        address: "Brgy. Tagabinet, Puerto Princesa City",
        barangay: "Tagabinet",
        lat: 10.1520,
        lng: 118.8720,
        circuitId: undergroundRiver.id,
      },
    }),
    prisma.business.create({
      data: {
        name: "Babuyan Twin Sandbar",
        category: "TOUR",
        about: "Beautiful twin sandbars perfect for swimming and picnics during low tide.",
        address: "Brgy. Babuyan, Puerto Princesa City",
        barangay: "Babuyan",
        lat: 9.8500,
        lng: 118.7800,
        circuitId: bayCoastal.id,
      },
    }),
    prisma.business.create({
      data: {
        name: "Bacungan Mangrove Eco-Park",
        category: "TOUR",
        about: "Community-managed mangrove conservation area with boardwalks and kayaking.",
        address: "Brgy. Bacungan, Puerto Princesa City",
        barangay: "Bacungan",
        lat: 10.0500,
        lng: 118.8100,
        circuitId: northernGateway.id,
      },
    }),
    prisma.business.create({
      data: {
        name: "Hobbai Island",
        category: "TOUR",
        about: "Secluded island getaway with pristine beaches and crystal-clear waters in Honda Bay.",
        address: "Honda Bay, Puerto Princesa City",
        barangay: "Sta. Lourdes",
        lat: 9.8600,
        lng: 118.7900,
        circuitId: bayCoastal.id,
      },
    }),
    prisma.business.create({
      data: {
        name: "Canigaran Floating Cottages",
        category: "TOUR",
        about: "Traditional floating cottages on the bay for relaxed seafood dining and swimming.",
        address: "Brgy. Canigaran, Puerto Princesa City",
        barangay: "Canigaran",
        lat: 9.7620,
        lng: 118.7250,
        circuitId: bayCoastal.id,
      },
    }),
    prisma.business.create({
      data: {
        name: "Simpokan Eco Trail",
        category: "TOUR",
        about: "Nature trail through forest leading to a scenic river with swimming holes.",
        address: "Brgy. Simpokan, Puerto Princesa City",
        barangay: "Simpokan",
        lat: 9.6800,
        lng: 118.7100,
        circuitId: southernCultural.id,
      },
    }),
    prisma.business.create({
      data: {
        name: "Simpokan Marine Sanctuary",
        category: "TOUR",
        about: "Protected marine area with excellent snorkeling and diverse coral reef ecosystems.",
        address: "Brgy. Simpokan, Puerto Princesa City",
        barangay: "Simpokan",
        lat: 9.6790,
        lng: 118.7080,
        circuitId: southernCultural.id,
      },
    }),
    prisma.business.create({
      data: {
        name: "Tagkuriring Waterfalls",
        category: "TOUR",
        about: "Hidden waterfall surrounded by lush tropical forest, accessible via a scenic trek.",
        address: "Brgy. Tagkuriring, Puerto Princesa City",
        barangay: "Tagkuriring",
        lat: 9.6500,
        lng: 118.6900,
        circuitId: southernCultural.id,
      },
    }),
    prisma.business.create({
      data: {
        name: "Tagkawayan Beach",
        category: "TOUR",
        about: "Pristine white sand beach ideal for swimming, camping, and watching sunsets.",
        address: "Brgy. Tagkawayan, Puerto Princesa City",
        barangay: "Tagkawayan",
        lat: 9.6400,
        lng: 118.6800,
        circuitId: southernCultural.id,
      },
    }),
    prisma.business.create({
      data: {
        name: "Acacia Tunnel",
        category: "TOUR",
        about: "Iconic tree-lined road forming a natural canopy tunnel, a popular photo destination.",
        address: "National Highway, Puerto Princesa City",
        barangay: "San Manuel",
        lat: 9.7550,
        lng: 118.7460,
        circuitId: cityCore.id,
      },
    }),
  ]);

  console.log("Created businesses.");

  // ============================================================
  // 4. VERIFIER PROFILE (assigned to Sabang Sea Ferry / Underground River area)
  // ============================================================
  await prisma.verifierProfile.create({
    data: {
      userId: verifier.id,
      assignedLocationId: tourDestinations[1].id, // Sabang Sea Ferry Terminal
    },
  });

  console.log("Created verifier profile.");

  // ============================================================
  // 5. FEE PAYMENTS (3 for tourist2)
  // ============================================================
  const now = new Date();

  // Active payment: paid 5 days ago, 2 Regular + 1 Palaweno = PHP 400
  const paidAt1 = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000);
  const validUntil1 = new Date(paidAt1.getTime() + 10 * 24 * 60 * 60 * 1000);
  const activePayment = await prisma.feePayment.create({
    data: {
      userId: tourist2.id,
      referenceId: `ZV-${paidAt1.toISOString().slice(0, 10).replace(/-/g, "")}-ACT001`,
      totalPersons: 3,
      totalAmount: 400,
      status: "ACTIVE",
      paidAt: paidAt1,
      validUntil: validUntil1,
      xenditPaymentId: "mock_active_001",
      xenditStatus: "PAID",
      lines: {
        create: [
          { payerType: "REGULAR_TOURIST", quantity: 2, unitPrice: 150, lineTotal: 300 },
          { payerType: "PALAWENO", quantity: 1, unitPrice: 100, lineTotal: 100 },
        ],
      },
    },
  });

  // Expired payment 1: paid 15 days ago, 1 Regular + 1 Student = PHP 270
  const paidAt2 = new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000);
  const validUntil2 = new Date(paidAt2.getTime() + 10 * 24 * 60 * 60 * 1000);
  await prisma.feePayment.create({
    data: {
      userId: tourist2.id,
      referenceId: `ZV-${paidAt2.toISOString().slice(0, 10).replace(/-/g, "")}-EXP001`,
      totalPersons: 2,
      totalAmount: 270,
      status: "EXPIRED",
      paidAt: paidAt2,
      validUntil: validUntil2,
      xenditPaymentId: "mock_expired_001",
      xenditStatus: "PAID",
      lines: {
        create: [
          { payerType: "REGULAR_TOURIST", quantity: 1, unitPrice: 150, lineTotal: 150 },
          { payerType: "STUDENT", quantity: 1, unitPrice: 120, lineTotal: 120 },
        ],
      },
    },
  });

  // Expired payment 2: paid 30 days ago, 3 Regular = PHP 450
  const paidAt3 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const validUntil3 = new Date(paidAt3.getTime() + 10 * 24 * 60 * 60 * 1000);
  await prisma.feePayment.create({
    data: {
      userId: tourist2.id,
      referenceId: `ZV-${paidAt3.toISOString().slice(0, 10).replace(/-/g, "")}-EXP002`,
      totalPersons: 3,
      totalAmount: 450,
      status: "EXPIRED",
      paidAt: paidAt3,
      validUntil: validUntil3,
      xenditPaymentId: "mock_expired_002",
      xenditStatus: "PAID",
      lines: {
        create: [
          { payerType: "REGULAR_TOURIST", quantity: 3, unitPrice: 150, lineTotal: 450 },
        ],
      },
    },
  });

  console.log("Created fee payments.");

  // ============================================================
  // 6. CHECK-INS (2 against active payment)
  // ============================================================
  const verifierProfile = await prisma.verifierProfile.findUnique({
    where: { userId: verifier.id },
  });

  if (verifierProfile) {
    // Check-in 3 days ago
    const checkDate1 = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
    checkDate1.setHours(9, 30, 0, 0);
    await prisma.checkIn.create({
      data: {
        feePaymentId: activePayment.id,
        verifierId: verifierProfile.id,
        totalPersons: 3,
        verifiedAt: checkDate1,
        checkDate: checkDate1,
      },
    });

    // Check-in 1 day ago
    const checkDate2 = new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000);
    checkDate2.setHours(10, 15, 0, 0);
    await prisma.checkIn.create({
      data: {
        feePaymentId: activePayment.id,
        verifierId: verifierProfile.id,
        totalPersons: 3,
        verifiedAt: checkDate2,
        checkDate: checkDate2,
      },
    });
  }

  console.log("Created check-ins.");

  // ============================================================
  // 7. EVENTS (8)
  // ============================================================
  const allBusinesses = [...hotels, ...resorts, ...restaurants, ...tourDestinations];

  await Promise.all([
    prisma.event.create({
      data: {
        title: "Underground River Anniversary Festival",
        description: "Annual celebration of the Puerto Princesa Subterranean River National Park as a UNESCO World Heritage Site. Features cultural performances, eco-tours, and environmental awareness activities.",
        startDate: new Date("2026-04-15"),
        endDate: new Date("2026-04-17"),
        location: "Sabang, Puerto Princesa City",
        isPromo: false,
        businessId: tourDestinations[1].id,
      },
    }),
    prisma.event.create({
      data: {
        title: "Subterranean Wonders Festival",
        description: "Showcase of the underground river's geological wonders with guided tours, photo exhibitions, and scientific talks about cave ecosystems.",
        startDate: new Date("2026-05-10"),
        endDate: new Date("2026-05-12"),
        location: "St. Paul Underground River, Sabang",
        isPromo: false,
      },
    }),
    prisma.event.create({
      data: {
        title: "Balayong Festival",
        description: "Puerto Princesa's premier festival celebrating the blooming of the Balayong (Palawan Cherry Blossom). Features street dancing, parades, and cultural shows.",
        startDate: new Date("2026-03-25"),
        endDate: new Date("2026-03-28"),
        location: "Puerto Princesa City Center",
        isPromo: false,
      },
    }),
    prisma.event.create({
      data: {
        title: "Puerto Princesa City Foundation Day",
        description: "Commemoration of the founding of Puerto Princesa City with civic programs, sports events, and community celebrations.",
        startDate: new Date("2026-03-04"),
        endDate: new Date("2026-03-04"),
        location: "Puerto Princesa City Hall",
        isPromo: false,
      },
    }),
    prisma.event.create({
      data: {
        title: "Lechon Festival",
        description: "Culinary celebration featuring Palawan's famous roasted pig, with cooking competitions, food stalls, and live entertainment.",
        startDate: new Date("2026-06-20"),
        endDate: new Date("2026-06-22"),
        location: "Baywalk, Puerto Princesa City",
        isPromo: true,
        businessId: restaurants[0].id,
      },
    }),
    prisma.event.create({
      data: {
        title: "Pista Y ang Ciudad",
        description: "City fiesta celebrating Puerto Princesa's patron saint with religious processions, cultural events, and community festivities.",
        startDate: new Date("2026-12-08"),
        endDate: new Date("2026-12-10"),
        location: "Immaculate Conception Cathedral, Puerto Princesa",
        isPromo: false,
      },
    }),
    prisma.event.create({
      data: {
        title: "Palawan Indigenous Peoples Day",
        description: "Cultural showcase honoring the indigenous communities of Palawan with traditional dances, crafts, and storytelling.",
        startDate: new Date("2026-10-29"),
        endDate: new Date("2026-10-29"),
        location: "Palawan Provincial Capitol",
        isPromo: false,
      },
    }),
    prisma.event.create({
      data: {
        title: "Puerto Princesa MICE Convention",
        description: "Meetings, Incentives, Conferences, and Exhibitions event promoting Puerto Princesa as a premier MICE destination.",
        startDate: new Date("2026-08-15"),
        endDate: new Date("2026-08-17"),
        location: "Puerto Princesa City Coliseum",
        isPromo: true,
      },
    }),
  ]);

  console.log("Created events.");

  // ============================================================
  // 8. REVIEWS (~20 spread across top businesses)
  // ============================================================
  const reviewData = [
    { businessIdx: 0, businesses: hotels, rating: 5, text: "Amazing hotel! The rooftop pool has a stunning view of the city. Staff was incredibly friendly and helpful." },
    { businessIdx: 0, businesses: hotels, rating: 4, text: "Great location and modern rooms. Breakfast buffet could be better but overall a wonderful stay." },
    { businessIdx: 2, businesses: hotels, rating: 5, text: "Loved the tropical garden atmosphere. Very peaceful and the rooms were spotless." },
    { businessIdx: 2, businesses: hotels, rating: 4, text: "Beautiful property with excellent service. A bit pricey but worth it for the experience." },
    { businessIdx: 0, businesses: resorts, rating: 5, text: "Best resort experience in Palawan! The beach is pristine and the activities are top-notch." },
    { businessIdx: 0, businesses: resorts, rating: 4, text: "Wonderful beachfront resort. The water sports were fantastic, highly recommend the jet ski!" },
    { businessIdx: 4, businesses: resorts, rating: 5, text: "Daluyon is a dream! Waking up to the sound of waves with the mountain backdrop is unforgettable." },
    { businessIdx: 4, businesses: resorts, rating: 5, text: "Eco-friendly resort done right. The architecture blends perfectly with nature. Must visit!" },
    { businessIdx: 0, businesses: restaurants, rating: 5, text: "The sunset view while eating fresh seafood is unbeatable. Best dining experience in Puerto Princesa!" },
    { businessIdx: 0, businesses: restaurants, rating: 4, text: "Great seafood and atmosphere. Can get crowded during sunset so arrive early. The grilled squid is a must!" },
    { businessIdx: 0, businesses: restaurants, rating: 5, text: "Iconic restaurant for a reason. The garlic butter shrimp and the waterfront setting are perfect." },
    { businessIdx: 1, businesses: restaurants, rating: 5, text: "KaLui is a culinary masterpiece. The set-course meal was incredible and the art gallery adds to the experience." },
    { businessIdx: 1, businesses: restaurants, rating: 4, text: "Excellent Filipino cuisine in a unique setting. No shoes policy adds to the charm. Reservation is a must!" },
    { businessIdx: 4, businesses: tourDestinations, rating: 5, text: "Ugong Rock was thrilling! The spelunking was an adventure and the zip-line at the top has amazing views." },
    { businessIdx: 4, businesses: tourDestinations, rating: 4, text: "Great adventure activity. Guides were knowledgeable and safety measures were excellent." },
    { businessIdx: 2, businesses: tourDestinations, rating: 5, text: "The mangrove paddle boat tour was so peaceful. We saw monitor lizards and beautiful birds!" },
    { businessIdx: 2, businesses: tourDestinations, rating: 4, text: "Relaxing boat ride through the mangroves. Great for families. The boatmen are very informative." },
    { businessIdx: 0, businesses: tourDestinations, rating: 4, text: "Beautiful waterfall but the trek to get there can be challenging. Bring proper footwear!" },
    { businessIdx: 1, businesses: artisans, rating: 5, text: "Gorgeous pearl jewelry at reasonable prices. The staff explained the pearl grading process. Bought gifts for everyone!" },
    { businessIdx: 0, businesses: artisans, rating: 4, text: "Beautiful handmade crafts that support indigenous communities. The beadwork is stunning." },
  ];

  for (const review of reviewData) {
    const business = review.businesses[review.businessIdx];
    const user = Math.random() > 0.5 ? tourist1 : tourist2;
    await prisma.review.create({
      data: {
        businessId: business.id,
        userId: user.id,
        rating: review.rating,
        text: review.text,
      },
    });
  }

  console.log("Created reviews.");

  console.log("Seeding complete!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
