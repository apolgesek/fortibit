import { ServiceIdentifier } from './service-identifier';

export function createServiceDecorator<T>(serviceId: string): ServiceIdentifier<T> {
  const id: any = function (target: any, key: string, index: number): any {
    if (arguments.length !== 3)
    {
      throw new Error('Decorator can only be used to decorate a parameter.');
    }

    if (!target['$meta$di']) target['$meta$di'] = [];
    target['$meta$di'].push({ serviceId, index });
  };

  return id;
}