export const erc20Abi = [
  { type: "function", name: "balanceOf", stateMutability: "view", inputs: [{ name: "account", type: "address" }], outputs: [{ type: "uint256" }] },
  { type: "function", name: "allowance", stateMutability: "view", inputs: [{ name: "owner", type: "address" }, { name: "spender", type: "address" }], outputs: [{ type: "uint256" }] },
  { type: "function", name: "approve", stateMutability: "nonpayable", inputs: [{ name: "spender", type: "address" }, { name: "amount", type: "uint256" }], outputs: [{ type: "bool" }] },
  { type: "function", name: "mint", stateMutability: "nonpayable", inputs: [{ name: "to", type: "address" }, { name: "amount", type: "uint256" }], outputs: [] },
] as const;

export const confidentialWrapperAbi = [
  { type: "function", name: "name", stateMutability: "view", inputs: [], outputs: [{ type: "string" }] },
  { type: "function", name: "symbol", stateMutability: "view", inputs: [], outputs: [{ type: "string" }] },
  { type: "function", name: "decimals", stateMutability: "view", inputs: [], outputs: [{ type: "uint8" }] },
  { type: "function", name: "confidentialBalanceOf", stateMutability: "view", inputs: [{ name: "account", type: "address" }], outputs: [{ type: "bytes32" }] },
  { type: "function", name: "isOperator", stateMutability: "view", inputs: [{ name: "holder", type: "address" }, { name: "spender", type: "address" }], outputs: [{ type: "bool" }] },
  { type: "function", name: "setOperator", stateMutability: "nonpayable", inputs: [{ name: "operator", type: "address" }, { name: "until", type: "uint48" }], outputs: [] },
  { type: "function", name: "wrap", stateMutability: "nonpayable", inputs: [{ name: "to", type: "address" }, { name: "amount", type: "uint256" }], outputs: [{ type: "bytes32" }] },
  { type: "function", name: "unwrap", stateMutability: "nonpayable", inputs: [{ name: "from", type: "address" }, { name: "to", type: "address" }, { name: "encryptedAmount", type: "bytes32" }, { name: "inputProof", type: "bytes" }], outputs: [{ type: "bytes32" }] },
] as const;
