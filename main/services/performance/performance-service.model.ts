import { createServiceDecorator } from '../../dependency-injection/create-service-decorator';

export const IPerformanceService = createServiceDecorator<IPerformanceService>('performanceService');
export interface IPerformanceService {
  mark(description: string): void;
} 