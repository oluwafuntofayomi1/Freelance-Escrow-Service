import { describe, it, expect, beforeEach } from 'vitest';

// Simulated contract state
let escrows: Map<number, {
  client: string,
  freelancer: string,
  amount: number,
  state: string,
  milestoneCount: number,
  completedMilestones: number
}>;
let escrowMilestones: Map<string, {
  description: string,
  amount: number,
  completed: boolean
}>;
let nextEscrowId: number;

// Simulated contract functions
function createEscrow(client: string, freelancer: string, totalAmount: number, milestoneCount: number): number {
  const escrowId = nextEscrowId;
  escrows.set(escrowId, {
    client,
    freelancer,
    amount: totalAmount,
    state: "CREATED",
    milestoneCount,
    completedMilestones: 0
  });
  nextEscrowId++;
  return escrowId;
}

function addMilestone(caller: string, escrowId: number, milestoneId: number, description: string, amount: number): boolean {
  const escrow = escrows.get(escrowId);
  if (!escrow) throw new Error('ERR_NOT_FOUND');
  if (escrow.client !== caller) throw new Error('ERR_NOT_AUTHORIZED');
  if (escrow.state !== "CREATED") throw new Error('ERR_INVALID_STATE');
  if (milestoneId >= escrow.milestoneCount) throw new Error('ERR_INVALID_STATE');
  
  const key = `${escrowId}-${milestoneId}`;
  escrowMilestones.set(key, { description, amount, completed: false });
  return true;
}

function startEscrow(caller: string, escrowId: number): boolean {
  const escrow = escrows.get(escrowId);
  if (!escrow) throw new Error('ERR_NOT_FOUND');
  if (escrow.client !== caller) throw new Error('ERR_NOT_AUTHORIZED');
  if (escrow.state !== "CREATED") throw new Error('ERR_INVALID_STATE');
  
  escrow.state = "IN_PROGRESS";
  escrows.set(escrowId, escrow);
  return true;
}

function completeMilestone(caller: string, escrowId: number, milestoneId: number): boolean {
  const escrow = escrows.get(escrowId);
  if (!escrow) throw new Error('ERR_NOT_FOUND');
  if (escrow.freelancer !== caller) throw new Error('ERR_NOT_AUTHORIZED');
  if (escrow.state !== "IN_PROGRESS") throw new Error('ERR_INVALID_STATE');
  
  const key = `${escrowId}-${milestoneId}`;
  const milestone = escrowMilestones.get(key);
  if (!milestone) throw new Error('ERR_NOT_FOUND');
  if (milestone.completed) throw new Error('ERR_INVALID_STATE');
  
  milestone.completed = true;
  escrowMilestones.set(key, milestone);
  escrow.completedMilestones++;
  escrows.set(escrowId, escrow);
  return true;
}

function releaseFunds(caller: string, escrowId: number): boolean {
  const escrow = escrows.get(escrowId);
  if (!escrow) throw new Error('ERR_NOT_FOUND');
  if (escrow.client !== caller) throw new Error('ERR_NOT_AUTHORIZED');
  if (escrow.state !== "IN_PROGRESS") throw new Error('ERR_INVALID_STATE');
  if (escrow.completedMilestones !== escrow.milestoneCount) throw new Error('ERR_INVALID_STATE');
  
  escrow.state = "COMPLETED";
  escrows.set(escrowId, escrow);
  return true;
}

function initiateDispute(caller: string, escrowId: number): boolean {
  const escrow = escrows.get(escrowId);
  if (!escrow) throw new Error('ERR_NOT_FOUND');
  if (escrow.client !== caller && escrow.freelancer !== caller) throw new Error('ERR_NOT_AUTHORIZED');
  if (escrow.state !== "IN_PROGRESS") throw new Error('ERR_INVALID_STATE');
  
  escrow.state = "DISPUTED";
  escrows.set(escrowId, escrow);
  return true;
}

function resolveDispute(caller: string, escrowId: number, clientShare: number, freelancerShare: number): boolean {
  const escrow = escrows.get(escrowId);
  if (!escrow) throw new Error('ERR_NOT_FOUND');
  if (caller !== 'CONTRACT_OWNER') throw new Error('ERR_NOT_AUTHORIZED');
  if (escrow.state !== "DISPUTED") throw new Error('ERR_INVALID_STATE');
  if (clientShare + freelancerShare !== escrow.amount) throw new Error('ERR_INVALID_STATE');
  
  escrow.state = "RESOLVED";
  escrows.set(escrowId, escrow);
  return true;
}

function cancelEscrow(caller: string, escrowId: number): boolean {
  const escrow = escrows.get(escrowId);
  if (!escrow) throw new Error('ERR_NOT_FOUND');
  if (escrow.client !== caller) throw new Error('ERR_NOT_AUTHORIZED');
  if (escrow.state !== "CREATED") throw new Error('ERR_INVALID_STATE');
  
  escrow.state = "CANCELLED";
  escrows.set(escrowId, escrow);
  return true;
}

describe('freelance-escrow contract test suite', () => {
  beforeEach(() => {
    escrows = new Map();
    escrowMilestones = new Map();
    nextEscrowId = 0;
  });
  
  it('should create an escrow successfully', () => {
    const escrowId = createEscrow('client1', 'freelancer1', 1000, 2);
    expect(escrowId).toBe(0);
    expect(escrows.size).toBe(1);
    const escrow = escrows.get(escrowId);
    expect(escrow).toBeDefined();
    expect(escrow?.state).toBe("CREATED");
  });
  
  it('should add milestones to an escrow', () => {
    const escrowId = createEscrow('client1', 'freelancer1', 1000, 2);
    expect(addMilestone('client1', escrowId, 0, 'First milestone', 500)).toBe(true);
    expect(addMilestone('client1', escrowId, 1, 'Second milestone', 500)).toBe(true);
    expect(escrowMilestones.size).toBe(2);
  });
  
  it('should start an escrow', () => {
    const escrowId = createEscrow('client1', 'freelancer1', 1000, 2);
    expect(startEscrow('client1', escrowId)).toBe(true);
    const escrow = escrows.get(escrowId);
    expect(escrow?.state).toBe("IN_PROGRESS");
  });
  
  it('should complete milestones', () => {
    const escrowId = createEscrow('client1', 'freelancer1', 1000, 2);
    addMilestone('client1', escrowId, 0, 'First milestone', 500);
    addMilestone('client1', escrowId, 1, 'Second milestone', 500);
    startEscrow('client1', escrowId);
    expect(completeMilestone('freelancer1', escrowId, 0)).toBe(true);
    expect(completeMilestone('freelancer1', escrowId, 1)).toBe(true);
    const escrow = escrows.get(escrowId);
    expect(escrow?.completedMilestones).toBe(2);
  });
  
  it('should release funds after all milestones are completed', () => {
    const escrowId = createEscrow('client1', 'freelancer1', 1000, 2);
    addMilestone('client1', escrowId, 0, 'First milestone', 500);
    addMilestone('client1', escrowId, 1, 'Second milestone', 500);
    startEscrow('client1', escrowId);
    completeMilestone('freelancer1', escrowId, 0);
    completeMilestone('freelancer1', escrowId, 1);
    expect(releaseFunds('client1', escrowId)).toBe(true);
    const escrow = escrows.get(escrowId);
    expect(escrow?.state).toBe("COMPLETED");
  });
  
  it('should initiate and resolve a dispute', () => {
    const escrowId = createEscrow('client1', 'freelancer1', 1000, 2);
    startEscrow('client1', escrowId);
    expect(initiateDispute('client1', escrowId)).toBe(true);
    const disputedEscrow = escrows.get(escrowId);
    expect(disputedEscrow?.state).toBe("DISPUTED");
    expect(resolveDispute('CONTRACT_OWNER', escrowId, 400, 600)).toBe(true);
    const resolvedEscrow = escrows.get(escrowId);
    expect(resolvedEscrow?.state).toBe("RESOLVED");
  });
  
  it('should cancel an escrow', () => {
    const escrowId = createEscrow('client1', 'freelancer1', 1000, 2);
    expect(cancelEscrow('client1', escrowId)).toBe(true);
    const cancelledEscrow = escrows.get(escrowId);
    expect(cancelledEscrow?.state).toBe("CANCELLED");
  });
  
  it('should fail to update escrow when called by non-authorized user', () => {
    const escrowId = createEscrow('client1', 'freelancer1', 1000, 2);
    expect(() => startEscrow('freelancer1', escrowId)).toThrow('ERR_NOT_AUTHORIZED');
    expect(() => addMilestone('freelancer1', escrowId, 0, 'Milestone', 500)).toThrow('ERR_NOT_AUTHORIZED');
    expect(() => completeMilestone('client1', escrowId, 0)).toThrow('ERR_NOT_AUTHORIZED');
    expect(() => releaseFunds('freelancer1', escrowId)).toThrow('ERR_NOT_AUTHORIZED');
    expect(() => cancelEscrow('freelancer1', escrowId)).toThrow('ERR_NOT_AUTHORIZED');
  });
  
  it('should fail to perform actions on non-existent escrow', () => {
    expect(() => startEscrow('client1', 999)).toThrow('ERR_NOT_FOUND');
    expect(() => addMilestone('client1', 999, 0, 'Milestone', 500)).toThrow('ERR_NOT_FOUND');
    expect(() => completeMilestone('freelancer1', 999, 0)).toThrow('ERR_NOT_FOUND');
    expect(() => releaseFunds('client1', 999)).toThrow('ERR_NOT_FOUND');
    expect(() => cancelEscrow('client1', 999)).toThrow('ERR_NOT_FOUND');
  });
  
  it('should fail to perform actions in invalid states', () => {
    const escrowId = createEscrow('client1', 'freelancer1', 1000, 2);
    startEscrow('client1', escrowId);
    expect(() => startEscrow('client1', escrowId)).toThrow('ERR_INVALID_STATE');
    expect(() => addMilestone('client1', escrowId, 0, 'Milestone', 500)).toThrow('ERR_INVALID_STATE');
    expect(() => cancelEscrow('client1', escrowId)).toThrow('ERR_INVALID_STATE');
  });
});

