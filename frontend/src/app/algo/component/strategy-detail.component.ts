import {Component, Input, OnChanges} from '@angular/core';
import {AlgoStrategyParamCall} from '../model/algo.dialog.visible';
import {SingleRecordConfigBase} from '../../shared/datashowbase/single.record.config.base';
import {TranslateService} from '@ngx-translate/core';
import {GlobalparameterService} from '../../shared/service/globalparameter.service';
import {FieldDescriptorInputAndShow} from '../model/field.descriptor.input.and.show';
import {DataType} from '../../dynamic-form/models/data.type';
import {AppHelper} from '../../shared/helper/app.helper';
import {AppSettings} from '../../shared/app.settings';
import {OptionalParams} from '../../shared/datashowbase/column.config';
import {DynamicFormPropertyHelps} from '../model/dynamic.form.property.helps';
import {DynamicFieldHelper} from '../../shared/helper/dynamic.field.helper';
import {AlgoStrategyHelper} from './algo.strategy.helper';


@Component({
  selector: 'strategy-detail',
  template: `
    <div *ngFor="let field of fields" class="row">
      <div class="col-lg-6 col-md-6 col-sm-6 col-xs-6 showlabel" align="right">
        {{field.headerTranslated}}:
      </div>
      <div class="col-lg-6 col-md-6 col-sm-6 col-xs-6 nopadding wrap">
        {{getValueByPath(dynamicModel, field)}}{{field.headerSuffix}}
      </div>
    </div>
  `
})
export class StrategyDetailComponent extends SingleRecordConfigBase implements OnChanges {
  @Input() algoStrategyParamCall: AlgoStrategyParamCall;

  dynamicModel: any = {};

  constructor(translateService: TranslateService, globalparameterService: GlobalparameterService) {
    super(translateService, globalparameterService);
  }

  ngOnChanges() {
    console.log('ngOnInit-AlgoStrategy:', this.algoStrategyParamCall.algoStrategy);
    console.log('ngOnInit-description:', this.algoStrategyParamCall.fieldDescriptorShow);
    this.dynamicModel = AlgoStrategyHelper.createAndSetValuesInDynamicModel(this.algoStrategyParamCall.algoStrategy,
      this.algoStrategyParamCall.fieldDescriptorShow);
    this.createDynamicOutputFields(this.algoStrategyParamCall.fieldDescriptorShow);
    this.translateHeadersAndColumns();
    this.createTranslatedValueStore([this.dynamicModel]);
  }


  private createDynamicOutputFields(fieldDescriptorInputAndShows: FieldDescriptorInputAndShow[]): void {
    this.fields = [];
    fieldDescriptorInputAndShows.forEach(fDIAS => {
      const optinalParams: OptionalParams = {};
      if (DataType[fDIAS.dataType] === DataType.None) {
        optinalParams.translateValues = true;
      }
      if (fDIAS.dynamicFormPropertyHelps
        && (<string[]>fDIAS.dynamicFormPropertyHelps)
          .indexOf(DynamicFormPropertyHelps[DynamicFormPropertyHelps.PERCENTAGE]) >= 0) {
        optinalParams.headerSuffix = '%';
      }
      this.addFieldProperty(DataType[fDIAS.dataType], fDIAS.fieldName,
        AppSettings.PREFIX_ALGO_FIELD + AppHelper.convertPropertyNameToUppercase(fDIAS.fieldName),
        optinalParams);

    });
  }

}