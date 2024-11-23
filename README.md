# Freelance Escrow Smart Contract

A secure and transparent escrow system built on Stacks blockchain using Clarity smart contracts. This contract facilitates safe transactions between clients and freelancers by holding funds in escrow until work is completed satisfactorily.

## Features

- **Secure Fund Management**: Holds STX tokens in escrow until project completion
- **Multi-State Workflow**: Supports the complete freelance project lifecycle
- **Dispute Resolution**: Built-in mechanism for handling disagreements
- **Role-Based Access Control**: Different permissions for clients, freelancers, and contract owner

## Contract States

1. `CREATED`: Initial state when escrow is funded by client
2. `ACCEPTED`: Freelancer has accepted the project
3. `COMPLETED`: Freelancer has marked the work as complete
4. `RELEASED`: Client has approved and released the funds
5. `DISPUTED`: Dispute raised, pending resolution
6. `RESOLVED`: Dispute has been resolved by contract owner
7. `CANCELLED`: Escrow cancelled by client before acceptance

## Public Functions

### create-escrow
Creates a new escrow account with specified amount and freelancer address
```clarity
(create-escrow amount: uint freelancer: principal)
```

### accept-escrow
Allows freelancer to accept the project
```clarity
(accept-escrow escrow-id: uint)
```

### complete-work
Marks the project as completed by freelancer
```clarity
(complete-work escrow-id: uint)
```

### release-payment
Releases the full payment to freelancer
```clarity
(release-payment escrow-id: uint)
```

### raise-dispute
Initiates a dispute for resolution
```clarity
(raise-dispute escrow-id: uint)
```

### resolve-dispute
Allows contract owner to resolve disputes by splitting funds
```clarity
(resolve-dispute escrow-id: uint client-share: uint freelancer-share: uint)
```

### cancel-escrow
Allows client to cancel escrow before freelancer accepts
```clarity
(cancel-escrow escrow-id: uint)
```

## Error Codes

- `err-not-found`: Escrow ID doesn't exist
- `err-not-authorized`: Caller doesn't have permission
- `err-invalid-state`: Invalid state transition
- `err-insufficient-funds`: Not enough STX tokens
- `err-already-exists`: Escrow ID already exists

## Usage Example

1. Client creates escrow:
```clarity
(contract-call? .freelance-escrow create-escrow u1000 'FREELANCER_ADDRESS)
```

2. Freelancer accepts project:
```clarity
(contract-call? .freelance-escrow accept-escrow u1)
```

3. After completion, freelancer marks work as complete:
```clarity
(contract-call? .freelance-escrow complete-work u1)
```

4. Client releases payment:
```clarity
(contract-call? .freelance-escrow release-payment u1)
```

## Security Considerations

1. Funds are held by the contract until explicit release
2. Only authorized participants can perform specific actions
3. State transitions are strictly controlled
4. Contract owner can only intervene in disputes
5. All functions include appropriate checks and validations

## Testing

To test the contract:
1. Deploy to testnet
2. Use Clarinet console for function calls
3. Test all state transitions
4. Verify error conditions
5. Test dispute resolution flow

## Development Setup

1. Install Clarinet
2. Clone repository
3. Run tests:
```bash
clarinet test
```

## Contract Deployment

1. Build contract:
```bash
clarinet build
```

2. Deploy to testnet/mainnet using Clarinet console or script

## License

[Add your chosen license]

## Contributing

Contributions are welcome! Please submit pull requests with any improvements.

## Support

For questions or support, please [create an issue](your-repo-link/issues) in the repository.
