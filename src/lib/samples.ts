// Clean fictional sample products, a messy variant, and a non-product sample
// to demonstrate the full pipeline including rejection.

export interface SampleProduct {
  id: string;
  name: string;
  fileName: string;
  fileType: string;
  rawText: string;
  kind: 'clean' | 'messy' | 'non-product';
}

export const SAMPLE_PRODUCTS: SampleProduct[] = [
  {
    id: 'sample-headphones',
    name: 'NovaSound X1 Wireless Headphones',
    fileName: 'novasound_x1_spec.txt',
    fileType: 'text/plain',
    kind: 'clean',
    rawText: `Product Name: NovaSound X1 Wireless Headphones
Brand: NovaSound
Category: Consumer Electronics
Subcategory: Audio
Product Type: Wireless Headphones

Price: ₹7,999
Currency: INR
Availability: In Stock
SKU: NS-X1-BLK

Weight: 285 g
Dimensions: 18 x 16 x 8 cm
Color: Midnight Black
Material: ABS Plastic
Capacity: 40 hours
Compatibility: Bluetooth 5.3, USB-C
Features: Active Noise Cancellation, Transparency Mode, USB-C Charging, Built-in Microphone
Technical Specifications: Driver: 40mm, Frequency: 20Hz-20kHz, Battery: 40 hours, Bluetooth: 5.3

Target Customer: Music enthusiasts and commuters
Intended Use: Daily listening, travel, office calls
Key Benefits: Studio-grade sound, all-day comfort, best-in-class noise cancellation
Market Positioning: Premium wireless audio for professionals

Competitors: SoundWave Pro, AudioMax Elite`,
  },
  {
    id: 'sample-smartwatch',
    name: 'PulseFit Pro Smartwatch',
    fileName: 'pulsefit_pro_spec.txt',
    fileType: 'text/plain',
    kind: 'clean',
    rawText: `Product Name: PulseFit Pro Smartwatch
Brand: PulseFit
Category: Consumer Electronics
Subcategory: Wearables
Product Type: Smartwatch

Price: ₹5,499
Currency: INR
Availability: In Stock
SKU: PF-PRO-GRPH

Weight: 48 g
Dimensions: 45 x 38 x 11.6 mm
Color: Graphite
Material: Aluminum
Capacity: 7 days
Compatibility: Bluetooth 5.2, USB-C
Features: Heart Rate Monitoring, Sleep Tracking, Water Resistance, Activity Tracking
Technical Specifications: Display: 1.78 inch AMOLED, Battery: 7 days, Water Resistance: 5ATM, Connectivity: Bluetooth 5.2

Target Customer: Fitness enthusiasts and health-conscious users
Intended Use: Activity tracking, health monitoring, notifications
Key Benefits: 7-day battery, medical-grade sensors, rugged design
Market Positioning: Mid-premium fitness wearable

Competitors: FitBand Pro, CardioWatch 7`,
  },
  {
    id: 'sample-laptop',
    name: 'AeroBook 14 Pro',
    fileName: 'aerobook_14_pro_spec.txt',
    fileType: 'text/plain',
    kind: 'clean',
    rawText: `Product Name: AeroBook 14 Pro
Brand: AeroBook
Category: Computers
Subcategory: Laptops
Product Type: Portable Laptop

Price: ₹64,999
Currency: INR
Availability: In Stock
SKU: AB-14-PRO-SLV

Weight: 1.42 kg
Dimensions: 32.2 x 22.4 x 1.6 cm
Color: Silver
Material: Aluminum
Compatibility: USB-C, Wi-Fi 6, Bluetooth 5.2
Features: USB-C, Wi-Fi 6, Backlit Keyboard, Fingerprint Reader
Technical Specifications: Display: 14 inch, RAM: 16 GB, Storage: 512 GB SSD, Processor: Octa-core

Target Customer: Students and mobile professionals
Intended Use: Productivity, content creation, remote work
Key Benefits: Ultra-light, all-day battery, powerful performance
Market Positioning: Premium ultraportable laptop

Competitors: ZenLite 14, UltraBook Air`,
  },
  {
    id: 'sample-messy',
    name: 'NovaSound X1 (Messy Data)',
    fileName: 'novasound_x1_messy.txt',
    fileType: 'text/plain',
    kind: 'messy',
    rawText: `NovaSound X1 wireless headphones, black, weighs about 0.285 kg. Price Rs 7999. Uses Bluetooth 5.3. Battery around 40 hours. ABS body. Has ANC and transparency mode. USB-C charging built in. Built-in microphone for calls.`,
  },
  {
    id: 'sample-nonproduct',
    name: 'Non-Product Document (Movie Plot)',
    fileName: 'movie_plot_sample.txt',
    fileType: 'text/plain',
    kind: 'non-product',
    rawText: `The Cleaner

The Cleaner is a 2007 American action comedy film directed by Les Mayfield and starring Cedric the Entertainer, Lucy Liu, and Nicollette Sheridan. The film follows a janitor who discovers he has been framed for a murder he did not commit.

The story begins in a small town where the protagonist works as a janitor at a local government building. One day he stumbles upon a conspiracy involving corrupt officials and a missing briefcase. The plot thickens when he realizes his own memories have been tampered with.

The film was a box office disappointment and received generally negative reviews from critics. The screenplay was written with the intention of creating a lighthearted action comedy but ultimately failed to find its audience.`,
  },
];

export function getSampleById(id: string): SampleProduct | undefined {
  return SAMPLE_PRODUCTS.find((s) => s.id === id);
}
