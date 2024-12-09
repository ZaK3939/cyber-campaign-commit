import { Address, Chain, createPublicClient, http, PublicClient, encodeFunctionData } from 'viem';
import { cyber } from 'viem/chains';

type CredResult = [boolean, string];

// Contract addresses for Phi NFT and Multicall
const PHI_CONTRACT_ADDRESS = '0x9baBBbE884fe75244f277F90d4bB696434fA1920' as const;
const MULTICALL3_ADDRESS = '0xcA11bde05977b3631167028862bE2a173976CA11' as const;

// ABI for the Phi contract's isCredMinted function
const PHI_CONTRACT_ABI = [
  {
    type: 'function',
    inputs: [
      { name: 'credChainId', internalType: 'uint256', type: 'uint256' },
      { name: 'credId', internalType: 'uint256', type: 'uint256' },
      { name: 'minter', internalType: 'address', type: 'address' },
    ],
    name: 'isCredMinted',
    outputs: [{ name: '', internalType: 'bool', type: 'bool' }],
    stateMutability: 'view',
  },
] as const;

// ABI for the Multicall3 contract
const MULTICALL3_ABI = [
  {
    inputs: [
      {
        components: [
          { name: 'target', type: 'address' },
          { name: 'allowFailure', type: 'bool' },
          { name: 'callData', type: 'bytes' },
        ],
        name: 'calls',
        type: 'tuple[]',
      },
    ],
    name: 'aggregate3',
    outputs: [
      {
        components: [
          { name: 'success', type: 'bool' },
          { name: 'returnData', type: 'bytes' },
        ],
        name: 'returnData',
        type: 'tuple[]',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

// RPC endpoint for Cyber network
const CYBRE_RPC = process.env.CYBER_RPC || 'https://rpc.cyber.co';

/**
 * Creates a public client for interacting with the specified blockchain
 * @param chain The blockchain network configuration
 * @returns A configured PublicClient instance
 */
async function createPublicClientForNetwork(chain: Chain): Promise<PublicClient> {
  try {
    const publicClient = createPublicClient({
      chain,
      transport: http(CYBRE_RPC),
    });

    if (!publicClient) {
      throw new Error('PublicClient is undefined');
    }

    return publicClient;
  } catch (error) {
    console.error('Error creating public client:', error);
    throw new Error(`Failed to create publicClient: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Checks if a user has specific Phi credentials using multicall
 * @param check_address The address to check credentials for
 * @param credIds Array of credential IDs to check
 * @returns [boolean, string] tuple indicating success/failure and error message if any
 */
export async function checkMultiplePhiCredentials(check_address: Address, credIds: number[]): Promise<CredResult> {
  try {
    const publicClient = await createPublicClientForNetwork(cyber);
    const chainId = 7560n;

    // Create multicall data for each credential ID
    const calls = credIds.map((credId) => ({
      target: PHI_CONTRACT_ADDRESS,
      allowFailure: false,
      callData: encodeFunctionData({
        abi: PHI_CONTRACT_ABI,
        functionName: 'isCredMinted',
        args: [chainId, BigInt(credId), check_address],
      }),
    }));

    // Execute multicall to check all credentials in a single transaction
    const results = await publicClient.readContract({
      address: MULTICALL3_ADDRESS,
      abi: MULTICALL3_ABI,
      functionName: 'aggregate3',
      args: [calls],
    });

    // Check if all credentials are minted
    // returnData of '0x01' indicates the credential is minted
    const allMinted = results.every((result) => {
      if (!result.success) return false;
      return result.returnData === '0x0000000000000000000000000000000000000000000000000000000000000001';
    });

    return [allMinted, ''];
  } catch (error) {
    console.error('Error checking PHI credentials:', error);
    return [false, 'Error checking credential status'];
  }
}
