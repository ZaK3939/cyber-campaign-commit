import { Address } from 'viem';
import { checkMultiplePhiCredentials } from './phiCredentials';

async function checkUserCredsForRewards(userAddress: Address): Promise<{
  has2of8: boolean;
  has4of4: boolean;
  has8of8: boolean;
  totalCount: number;
}> {
  // Check all 8 credentials first
  // example id: 8 https://cyber.terminal.phi.box/cred/8
  const [allCredsResult] = await checkMultiplePhiCredentials(userAddress, [2, 3, 4, 5, 6, 7, 8, 9]);

  if (allCredsResult) {
    // If user has all 8, they qualify for all tiers
    return {
      has2of8: true,
      has4of4: true,
      has8of8: true,
      totalCount: 8,
    };
  }

  // Get individual credential status
  const credResults = await Promise.all(
    Array.from({ length: 8 }, (_, i) => checkMultiplePhiCredentials(userAddress, [i + 2])),
  );

  // Count how many credentials the user has
  const totalCredentials = credResults.filter(([result]) => result).length;

  return {
    has2of8: totalCredentials >= 2,
    has4of4: totalCredentials >= 4,
    has8of8: totalCredentials === 8,
    totalCount: totalCredentials, // 追加: 実際の保有数を返す
  };
}

// Usage example
async function main() {
  const address = process.argv[2];

  if (!address) {
    console.error('Please provide an address as an argument');
    console.error('Usage: ts-node script.ts <address>');
    process.exit(1);
  }

  try {
    const results = await checkUserCredsForRewards(address as Address);
    console.log('Credential check results:', results);
    console.log(`User has ${results.totalCount} out of 8 credentials`);

    if (results.has8of8) {
      console.log('User eligible for 8/8 rewards (has all credentials)');
    } else if (results.has4of4) {
      console.log(`User eligible for 4/4 rewards (has ${results.totalCount} credentials)`);
    } else if (results.has2of8) {
      console.log(`User eligible for 2/8 rewards (has ${results.totalCount} credentials)`);
    } else {
      console.log(`User not eligible for any rewards (has only ${results.totalCount} credentials)`);
    }
  } catch (error) {
    console.error('Error checking credentials:', error);
    process.exit(1);
  }
}

main();
