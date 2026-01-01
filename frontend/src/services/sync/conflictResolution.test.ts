import {
  resolveConflict,
  serverWinsStrategy,
  clientWinsStrategy,
  mergeQuantityStrategy,
} from './conflictResolution';

describe('Conflict Resolution Strategies', () => {
  const clientData = { id: 1, name: 'Item A', quantity: 10 };
  const serverData = { id: 1, name: 'Item A', quantity: 20 };

  describe('serverWinsStrategy', () => {
    it('should return server data', () => {
      const result = resolveConflict(clientData, serverData, serverWinsStrategy);
      expect(result).toEqual(serverData);
    });
  });

  describe('clientWinsStrategy', () => {
    it('should return client data', () => {
      const result = resolveConflict(clientData, serverData, clientWinsStrategy);
      expect(result).toEqual(clientData);
    });
  });

  describe('mergeQuantityStrategy', () => {
    it('should sum quantities if both have numeric quantity', () => {
      const result = resolveConflict(clientData, serverData, mergeQuantityStrategy);
      expect(result).toEqual({ ...serverData, quantity: 30 });
    });

    it('should fallback to server wins if quantity is missing', () => {
      const badClient = { id: 1, name: 'Item A' };
      const badServer = { id: 1, name: 'Item A' };
      const result = resolveConflict(badClient, badServer, mergeQuantityStrategy);
      expect(result).toEqual(badServer);
    });
  });

  describe('resolveConflict default', () => {
    it('should default to server wins', () => {
      const result = resolveConflict(clientData, serverData);
      expect(result).toEqual(serverData);
    });
  });
});
