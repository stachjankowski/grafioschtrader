import * as moment from 'moment';
import {combineLatest} from 'rxjs';
import {TranslateService} from '@ngx-translate/core';
import {GlobalparameterService} from '../service/globalparameter.service';
import {DataType} from '../../dynamic-form/models/data.type';
import {Helper} from '../../helper/helper';
import {ColumnConfig} from '../datashowbase/column.config';
import {ParamMap} from '@angular/router';
import {FormConfig} from '../../dynamic-form/models/form.config';
import {HttpHeaders, HttpParams} from '@angular/common/http';
import {GlobalSessionNames} from '../global.session.names';
import {AppSettings} from '../app.settings';
import {ConfirmationService} from 'primeng/api';


export const enum Comparison { GT, LT, EQ }

type CompareFunc<T, S> = (a: T, b: S) => Comparison;


export class AppHelper {

  static readonly fieldToLabelRegex = new RegExp('^(rand|year|group)|(DiffMC|MC)$', 'g');

  static getUntilDateBySessionStorage(): Date {
    return AppHelper.getDateFromSessionStorage(GlobalSessionNames.REPORT_UNTIL_DATE, new Date());
  }

  static getDateFromSessionStorage(property: string, defaultDate = new Date()): Date {
    const date = sessionStorage.getItem(property);
    return date ? moment(date).toDate() : defaultDate;
  }

  static saveUntilDateInSessionStorage(untilDate: Date): void {
    AppHelper.saveDateToSessionStore(GlobalSessionNames.REPORT_UNTIL_DATE, untilDate);
  }

  static addSpaceToCurrency(currency: string): string {
    return currency + ' ';
  }

  static saveDateToSessionStore(property: string, date: Date) {
    sessionStorage.setItem(property, moment(date).format('YYYY-MM-DD'));
  }

  static getOptionsWithIncludeClosedPositionAndUntilDate(includeClosedPosition: boolean, untilDate: Date, httpHeaders: HttpHeaders) {
    const headerParam = AppHelper.getOptionsWithUntilDate(untilDate, httpHeaders);
    headerParam.params = headerParam.params.append('includeClosedPosition', includeClosedPosition.toString());
    return headerParam;
  }

  static getOptionsWithUntilDate(untilDate: Date, httpHeaders: HttpHeaders) {
    const httpParams = new HttpParams()
      .set('untilDate', moment(untilDate).format('YYYY-MM-DD'));
    return {headers: httpHeaders, params: httpParams};
  }


  static transformDataToRealClassDataList<T>(type: new() => T, data: T): T {
    const instance = new type();
    return (Object.assign(instance, data));
  }


  public static createParamObjectFromParamMap(paramMap: ParamMap): any {
    const paramObject = {};
    paramMap.keys.forEach(key => paramObject[key] = JSON.parse(paramMap.get(key)));
    return paramObject;
  }


  /**
   * Returns 'ABC_DEF_GH' from 'abcDefGh', and TRANSACTION_GAIN_LOSS_MC from 'transactionGainLossMC'
   */
  public static convertPropertyNameToUppercase(upperLower: string): string {
    let startPoint = upperLower.indexOf('.');
    startPoint = startPoint < 0 ? 0 : startPoint + 1;
    return upperLower.substring(startPoint).replace(/([a-z])([A-Z])/g, '$1_$2').toUpperCase();
  }

  public static convertPropertyForLabelOrHeaderKey(upperLower: string): string {
    return this.convertPropertyNameToUppercase(upperLower.replace(this.fieldToLabelRegex, ''));
  }

  public static truncateString(str: string, length: number, useWordBoundary: boolean): string {
    if (str.length <= length) {
      return str;
    } else {
      const subString = str.substr(0, length - 1);
      return (useWordBoundary
        ? subString.substr(0, subString.lastIndexOf(' '))
        : subString) + '...';
    }
  }

  public static getValueByPathWithField(globalparameterService: GlobalparameterService, translateService: TranslateService,
                                        dataobject: any, field: ColumnConfig, valueField: string) {
    dataobject = Helper.getValueByPath(dataobject, valueField);
    if (dataobject || field.dataType === DataType.NumericShowZero && dataobject === 0) {

      switch (field.dataType) {
        case DataType.NumericInteger:
          return AppHelper.numberIntegerFormat(globalparameterService, dataobject);
        case DataType.Numeric:
        case DataType.NumericShowZero:
          return AppHelper.numberFormat(globalparameterService, dataobject, field.maxFractionDigits, field.minFractionDigits);
        case DataType.NumericRaw:
          return globalparameterService.getNumberFormatRaw().format(dataobject);
        case DataType.DateNumeric:
        case DataType.DateString:
          return this.getDateByFormat(globalparameterService, dataobject);
        case DataType.DateTimeNumeric:
          return moment(+dataobject).format(globalparameterService.getTimeDateFormatForTable());
        case DataType.DateTimeString:
          return moment(dataobject).format(globalparameterService.getTimeDateFormatForTable());
        default:
          /*
                    if (field.translateValues && field.translatedVauleMap) {
                      return dataobject;
                    } else {
                      (field.translateValues && translateService) ? translateService.instant(dataobject) : dataobject;
                    }
          */
          return dataobject;
      }
    }
  }

  public static getDateByFormat(globalparameterService: GlobalparameterService, dataobject: string): string {
    return moment(dataobject).format(globalparameterService.getDateFormat());
  }


  public static numberFormat(globalparameterService: GlobalparameterService, value: number, maxFractionDigits: number,
                             minFractionDigits: number) {
    if (maxFractionDigits) {
      const n = Math.log(Math.abs(value)) / Math.LN10;
      if (n < 1) {
        // negativ number
        return value.toFixed(Math.max(maxFractionDigits, Math.max(minFractionDigits || 2,
          Math.max(2, Math.ceil(Math.abs(n)) + ((n < 0) ? 4 : 2)))))
          .split('.').join(globalparameterService.getDecimalSymbol());
      }
    }
    return globalparameterService.getNumberFormat().format(value);
  }

  public static numberIntegerFormat(globalparameterService: GlobalparameterService, value: number) {
    return value.toLocaleString(globalparameterService.getLocale());
  }

  /**
   * When return value is minus -> it is the index of the next value which is greater than serch value.
   */
  public static binarySearch<T, S>(array: T[], item: S, compare: CompareFunc<T, S>): number {
    let [left, right] = [0, array.length - 1];
    let middle = 1;
    while (left <= right) {
      middle = Math.floor((left + right) / 2);

      switch (compare(array[middle], item)) {
        case Comparison.LT:
          left = middle + 1;
          break;
        case Comparison.GT:
          right = middle - 1;
          break;
        default:
          return middle;
      }
    }

    if (array.length > middle && compare(array[middle], item) === Comparison.LT) {
      middle += 1;
    }

    return middle * -1;
  }


  /**
   * Shows a confirm dialog which is expecting an user input to confirm the action.
   */
  public static confirmationDialog(translateService: TranslateService, confirmationService: ConfirmationService, msgKey: string,
                                   acceptFN: Function, headerKey: string = 'MSG_GENERAL_HEADER') {
    if (msgKey.indexOf('|') >= 0) {
      const msgParam: string[] = msgKey.split('|');
      translateService.get(msgParam[1]).subscribe(paramTrans => AppHelper.confirmationDialogParam(translateService,
        confirmationService, msgParam[0], paramTrans, acceptFN, headerKey));
    } else {
      AppHelper.confirmationDialogParam(translateService, confirmationService, msgKey, null, acceptFN, headerKey);
    }
  }

  private static confirmationDialogParam(translateService: TranslateService, confirmationService: ConfirmationService, msgKey: string,
                                         param: string, acceptFN: Function, headerKey: string) {

    const observableMsg = (param) ? translateService.get(msgKey, {i18nRecord: param}) : translateService.get(msgKey);
    const observableHeaderKey = translateService.get(headerKey);

    combineLatest([observableMsg, observableHeaderKey]).subscribe((translated: string[]) => {
      confirmationService.confirm({
        message: translated[0],
        header: translated[1],
        accept: acceptFN
      });
    });
  }


  public static getDefaultFormConfig(globalparameterService: GlobalparameterService, labelcolums: number,
                                     helpLinkFN: Function = null, nonModal = false): FormConfig {
    return {
      locale: globalparameterService.getLocale(),
      labelcolumns: labelcolums, language: globalparameterService.getUserLang(),
      thousandsSeparatorSymbol: globalparameterService.getThousandsSeparatorSymbol(),
      dateFormat: globalparameterService.getDateFormatForCalendar().toLowerCase(),
      decimalSymbol: globalparameterService.getDecimalSymbol(), helpLinkFN: helpLinkFN, nonModal: nonModal
    };
  }


  public static getHttpParamsOfObject(dataobject: any): HttpParams {
    let params = new HttpParams();
    for (const key in dataobject) {
      if (dataobject.hasOwnProperty(key) && dataobject[key] != null
        && dataobject[key] !== '') {
        const val = dataobject[key];
        params = params.append(key, '' + val);
      }
    }
    return params;
  }



}

export class TranslateParam {
  translatedValue: string;


  constructor(public paramName, public paramValue: string, public translate: boolean) {
  }

  getInterpolateParam(): { [key: string]: any } {
    const interpolateParam = {};
    interpolateParam[this.paramName] = this.translate ? this.translatedValue : this.paramValue;
    return interpolateParam;
  }
}