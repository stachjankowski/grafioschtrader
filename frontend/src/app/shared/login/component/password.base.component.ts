import {DataType} from '../../../dynamic-form/models/data.type';
import {FieldConfig} from '../../../dynamic-form/models/field.config';
import {FormConfig} from '../../../dynamic-form/models/form.config';
import {TranslateService} from '@ngx-translate/core';
import {RuleEvent} from '../../../dynamic-form/error/error.message.rules';
import {FieldFormGroup} from '../../../dynamic-form/models/form.group.definition';
import {DynamicFormComponent} from '../../../dynamic-form/containers/dynamic-form/dynamic-form.component';
import { ViewChild, Directive } from '@angular/core';
import {DynamicFieldHelper} from '../../helper/dynamic.field.helper';
import {AppHelper} from '../../helper/app.helper';
import {TranslateHelper} from '../../helper/translate.helper';
import {equalTo} from '../../validator/validator';

@Directive()
export abstract class PasswordBaseComponent {

  // Access child components
  @ViewChild(DynamicFormComponent) form: DynamicFormComponent;

  readonly passwordConfirm = 'passwordConfirm';

  // Form configuration
  formConfig: FormConfig;
  config: FieldFormGroup[] = [];
  configPassword: FieldConfig[];
  configObject: { [name: string]: FieldConfig };

  protected constructor(public translateService: TranslateService, newPassword: boolean) {

    this.configPassword = [
      // TODO Should only accept better passwords
      DynamicFieldHelper.createFieldDAInputString(DataType.Password, 'password', (newPassword) ? 'PASSWORD_NEW' : 'PASSWORD',
        30, true),
      DynamicFieldHelper.createFieldDAInputString(DataType.Password, this.passwordConfirm,
        (newPassword) ? 'PASSWORD_NEW_CONFIRM' : 'PASSWORD_CONFIRM',
        30, true)
    ];

  }


  afterViewInit(): void {
    this.configObject[this.passwordConfirm].errors.push({
      name: 'equalTo',
      keyi18n: 'equalToPassword',
      rules: [RuleEvent.TOUCHED, 'dirty']
    });
    TranslateHelper.translateMessageError(this.translateService, this.configObject[this.passwordConfirm]);
    this.configObject[this.passwordConfirm].validation.push(equalTo(this.configObject.password.formControl));
    this.configObject[this.passwordConfirm].formControl.setValidators(this.configObject.passwordConfirm.validation);
    this.configObject[this.passwordConfirm].formControl.updateValueAndValidity();
  }

}