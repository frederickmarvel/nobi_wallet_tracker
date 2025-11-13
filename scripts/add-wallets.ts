import axios from 'axios';

const API_BASE_URL = 'http://localhost:3000/api/v1';

// Network mapping from wallet.txt to Alchemy network names
const NETWORK_MAP: Record<string, string> = {
  'ETH': 'eth-mainnet',
  'POL': 'polygon-mainnet',
  'ARB': 'arb-mainnet',
  'BSC': 'bsc-mainnet',
  'BASE': 'base-mainnet',
};

// Wallets from wallet.txt - only EVM-compatible chains
const WALLETS = [
  {
    name: 'NOBI LABS LEDGER',
    address: '0x455e53cbb86018ac2b8092fdcd39d8444affc3f6',
    networks: ['ETH', 'POL', 'ARB', 'BSC', 'BASE'],
    description: 'Main Nobi Labs Ledger wallet across multiple EVM chains',
  },
  {
    name: 'NOBI LABS LEDGER - MF USDT',
    address: '0xE8c24Ce4c8D3FF7AB82Efd7A74752E7393ff57CB',
    networks: ['ETH'],
    description: 'Nobi Labs Ledger - MF USDT',
  },
  {
    name: 'NOBI LABS LEDGER - MF ETH',
    address: '0x432b5780e008822eCc430506766CCa53D496bafd',
    networks: ['ETH'],
    description: 'Nobi Labs Ledger - MF ETH',
  },
  {
    name: 'NOBI LABS LEDGER - MF BTC',
    address: '0xC38aCc4cD96B6Ae2A820910972eA66085D0BbC2A',
    networks: ['ETH'],
    description: 'Nobi Labs Ledger - MF BTC',
  },
  {
    name: 'METAMASK MAC SEN',
    address: '0x2f5780dd1b6ad5fdae2076d639026a238a876044',
    networks: ['ETH', 'POL'],
    description: 'MetaMask Mac Sen wallet',
  },
  {
    name: 'SAFE EXPENSE',
    address: '0x698364F6a2032A47ed5b952b36280d4C0FF97A91',
    networks: ['BASE'],
    description: 'Safe Expense wallet on Base',
  },
];

async function addWallet(wallet: {
  name: string;
  address: string;
  networks: string[];
  description: string;
}) {
  try {
    const mappedNetworks = wallet.networks
      .map((network) => NETWORK_MAP[network])
      .filter(Boolean);

    if (mappedNetworks.length === 0) {
      console.log(`⚠️  Skipping ${wallet.name}: No supported networks`);
      return;
    }

    const payload = {
      address: wallet.address.toLowerCase(),
      name: wallet.name,
      description: wallet.description,
      networks: mappedNetworks,
      active: true,
    };

    console.log(`Adding wallet: ${wallet.name} (${wallet.address})...`);
    
    const response = await axios.post(`${API_BASE_URL}/wallets`, payload);
    
    console.log(`✅ Added wallet: ${wallet.name}`);
    console.log(`   ID: ${response.data.id}`);
    console.log(`   Networks: ${mappedNetworks.join(', ')}`);
    console.log('');
    
    return response.data;
  } catch (error: any) {
    if (error.response?.status === 409) {
      console.log(`ℹ️  Wallet already exists: ${wallet.name}`);
      console.log('');
    } else {
      console.error(`❌ Failed to add wallet ${wallet.name}:`, error.response?.data || error.message);
      console.log('');
    }
  }
}

async function main() {
  console.log('🚀 Starting wallet addition process...\n');
  console.log(`Total wallets to add: ${WALLETS.length}\n`);

  for (const wallet of WALLETS) {
    await addWallet(wallet);
    // Small delay to avoid overwhelming the API
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  console.log('✨ Wallet addition process completed!\n');
  
  // Fetch and display all wallets
  try {
    const response = await axios.get(`${API_BASE_URL}/wallets`);
    console.log(`📊 Total wallets in system: ${response.data.length}\n`);
    
    console.log('Current wallets:');
    response.data.forEach((wallet: any) => {
      console.log(`  - ${wallet.name} (${wallet.address})`);
      console.log(`    Networks: ${wallet.networks.join(', ')}`);
      console.log(`    Active: ${wallet.active}`);
      console.log('');
    });
  } catch (error) {
    console.error('Failed to fetch wallets:', error);
  }
}

// Run the script
main().catch(console.error);
