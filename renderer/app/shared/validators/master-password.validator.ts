import { AbstractControl, AsyncValidatorFn, ValidationErrors } from '@angular/forms';
import { IpcChannel } from '@shared-renderer/index';
import { IMessageBroker } from '../../core/models';

export function masterPasswordValidator(messageBroker: IMessageBroker): AsyncValidatorFn {
	return async (control: AbstractControl<string>): Promise<ValidationErrors | null> => {
    const result: boolean = await messageBroker.ipcRenderer.invoke(
			IpcChannel.ValidatePassword,
			control.value,
		);

		return result ? null : { invalidPassword: true };
	};
}
