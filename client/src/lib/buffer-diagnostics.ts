/**
 * Buffer Diagnostics
 * 
 * This module provides diagnostic functions to check Buffer implementations
 * and detect issues that might cause problems with transaction processing.
 */

import * as buffer from 'buffer';
import BN from 'bn.js';

// Type aliases for clarity
type BufferConstructor = typeof Buffer;
type BufferInstance = Buffer;

// Simple diagnostic data object returned by test functions
interface DiagnosticResult {
  success: boolean;
  details: {
    test: string;
    result: string;
    isError?: boolean;
    error?: any;
  }[];
}

/**
 * Comprehensive Buffer diagnostic tests
 * Runs multiple checks on Buffer implementation
 */
export function runBufferDiagnostics(): DiagnosticResult {
  console.log("🧪 Running comprehensive Buffer diagnostics");
  
  const diagnosticResults: DiagnosticResult = {
    success: true,
    details: []
  };
  
  // Test 1: Check if Buffer is defined
  try {
    const hasBuffer = typeof Buffer !== 'undefined';
    diagnosticResults.details.push({
      test: "Buffer existence",
      result: hasBuffer ? "Available" : "Not available",
      isError: !hasBuffer
    });
    if (!hasBuffer) diagnosticResults.success = false;
  } catch (e) {
    diagnosticResults.details.push({
      test: "Buffer existence check",
      result: "Exception during check",
      isError: true,
      error: e
    });
    diagnosticResults.success = false;
  }
  
  // Test 2: Check Buffer.from functionality
  try {
    const testArray = [1, 2, 3, 4];
    const bufferFromTest = Buffer.from(testArray);
    const testPassed = bufferFromTest.length === testArray.length && 
                      bufferFromTest[0] === testArray[0];
    
    diagnosticResults.details.push({
      test: "Buffer.from",
      result: testPassed ? 
        `Success (${bufferFromTest.toString('hex')})` : 
        "Failed - incorrect data",
      isError: !testPassed
    });
    if (!testPassed) diagnosticResults.success = false;
  } catch (e) {
    diagnosticResults.details.push({
      test: "Buffer.from",
      result: "Exception during test",
      isError: true,
      error: e
    });
    diagnosticResults.success = false;
  }
  
  // Test 3: Check Buffer.alloc functionality
  try {
    const allocSize = 4;
    const bufferAllocTest = Buffer.alloc(allocSize);
    const testPassed = bufferAllocTest.length === allocSize;
    
    diagnosticResults.details.push({
      test: "Buffer.alloc",
      result: testPassed ? 
        `Success (size: ${bufferAllocTest.length})` : 
        `Failed - incorrect size: ${bufferAllocTest.length}`,
      isError: !testPassed
    });
    if (!testPassed) diagnosticResults.success = false;
  } catch (e) {
    diagnosticResults.details.push({
      test: "Buffer.alloc",
      result: "Exception during test",
      isError: true,
      error: e
    });
    diagnosticResults.success = false;
  }
  
  // Test 4: Check BN.js integration with Buffer
  try {
    const testBN = new BN(12345);
    const bnBuffer = Buffer.from(testBN.toArray('le', 8));
    const backToBN = new BN(bnBuffer, 'le');
    const testPassed = backToBN.eq(testBN);
    
    diagnosticResults.details.push({
      test: "BN.js ⟷ Buffer",
      result: testPassed ? 
        `Success (${testBN.toString()} ⟷ ${backToBN.toString()})` : 
        `Failed - data mismatch: ${testBN.toString()} ≠ ${backToBN.toString()}`,
      isError: !testPassed
    });
    if (!testPassed) diagnosticResults.success = false;
  } catch (e) {
    diagnosticResults.details.push({
      test: "BN.js ⟷ Buffer",
      result: "Exception during test",
      isError: true,
      error: e
    });
    diagnosticResults.success = false;
  }
  
  // Test 5: Check Buffer.writeUInt32LE and readUInt32LE
  try {
    const testValue = 0x12345678;
    const writeBuffer = Buffer.alloc(4);
    writeBuffer.writeUInt32LE(testValue, 0);
    const readValue = writeBuffer.readUInt32LE(0);
    const testPassed = readValue === testValue;
    
    diagnosticResults.details.push({
      test: "Buffer read/write UInt32LE",
      result: testPassed ? 
        `Success (${testValue.toString(16)} ⟷ ${readValue.toString(16)})` : 
        `Failed - data mismatch: ${testValue.toString(16)} ≠ ${readValue.toString(16)}`,
      isError: !testPassed
    });
    if (!testPassed) diagnosticResults.success = false;
  } catch (e) {
    diagnosticResults.details.push({
      test: "Buffer read/write UInt32LE",
      result: "Exception during test",
      isError: true,
      error: e
    });
    diagnosticResults.success = false;
  }
  
  // Log all results
  console.log("📊 Buffer diagnostic results:", diagnosticResults);
  
  return diagnosticResults;
}

/**
 * Check if Buffer implementation is fully functional
 * This provides a simple boolean result suitable for runtime code paths
 */
export function isBufferFullyFunctional(): boolean {
  try {
    const result = runBufferDiagnostics();
    return result.success;
  } catch (e) {
    console.error("❌ Error running buffer diagnostics:", e);
    return false;
  }
}

/**
 * Get a safe array conversion function that doesn't depend on Buffer
 * This is a fallback for environments where Buffer might not work correctly
 */
export function getSafeArrayConverter() {
  // Test if Buffer is working first
  const bufferWorks = isBufferFullyFunctional();
  
  if (bufferWorks) {
    // If Buffer works, use it
    return {
      bnToArray: (bn: BN, length: number, endian: 'le' | 'be' = 'le'): number[] => {
        return Array.from(Buffer.from(bn.toArray(endian, length)));
      },
      arrayToUint8Array: (arr: number[]): Uint8Array => {
        return new Uint8Array(arr);
      }
    };
  } else {
    // Pure JS fallback implementation
    return {
      bnToArray: (bn: BN, length: number, endian: 'le' | 'be' = 'le'): number[] => {
        // Convert BN to array without using Buffer
        const rawArray = bn.toArray(endian, length);
        return Array.from(rawArray);
      },
      arrayToUint8Array: (arr: number[]): Uint8Array => {
        const result = new Uint8Array(arr.length);
        for (let i = 0; i < arr.length; i++) {
          result[i] = arr[i] & 0xFF; // Ensure bytes
        }
        return result;
      }
    };
  }
}