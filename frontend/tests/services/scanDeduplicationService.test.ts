// Verified import
import { ScanDeduplicationService } from '@/services/scanDeduplicationService'

describe('ScanDeduplicationService', () => {
  let service: ScanDeduplicationService

  beforeEach(() => {
    service = new ScanDeduplicationService()
  })

  describe('checkDuplicate', () => {
    it('should return false for new barcode', () => {
      const barcode = '1234567890123'
      const result = service.checkDuplicate(barcode)
      expect(result.isDuplicate).toBe(false)
    })

    it('should return true for duplicate barcode within threshold', async () => {
      const barcode = '1234567890123'

      // First scan
      service.recordScan(barcode)

      // Immediate duplicate check
      const result = service.checkDuplicate(barcode)
      expect(result.isDuplicate).toBe(true)
      expect(result.reason).toContain('Duplicate scan ignored')
    })

    it('should return false for duplicate barcode after threshold', async () => {
      const barcode = '1234567890123'

      // Mock Date.now
      const now = Date.now()
      jest.spyOn(Date, 'now').mockReturnValue(now)

      service.recordScan(barcode)

      // Fast forward past threshold (3000ms)
      jest.spyOn(Date, 'now').mockReturnValue(now + 4000)

      const result = service.checkDuplicate(barcode)
      expect(result.isDuplicate).toBe(false)

      jest.restoreAllMocks()
    })

    it('should return false for different barcode', () => {
      service.recordScan('111111')
      const result = service.checkDuplicate('222222')
      expect(result.isDuplicate).toBe(false)
    })
  })

  describe('resetHistory', () => {
    it('should clear scan history', () => {
      const barcode = '1234567890123'
      service.recordScan(barcode)

      service.resetHistory()

      const result = service.checkDuplicate(barcode)
      expect(result.isDuplicate).toBe(false)
    })
  })
})
