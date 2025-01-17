package grafioschtrader.reportviews.securityaccount;

import java.util.ArrayList;
import java.util.List;

import grafioschtrader.common.DataHelper;

/**
 * Base class for a group of securities. For example they may be grouped by
 * currency or asset class.
 * 
 * @author Hugo Graf
 *
 */
public abstract class SecurityPositionGroupSummary {

  public double groupAccountValueSecurityMC;
  public double groupGainLossSecurityMC = 0.0;

  public double groupValueSecurityShort;
  public double groupSecurityRiskMC;
  
  public List<SecurityPositionSummary> securityPositionSummaryList = new ArrayList<>();

  private int precision;
  private int precisionMC;

  
  public void addToGroupSummaryAndCalcGroupTotals(SecurityPositionSummary securityPositionSummary) {
    precision = securityPositionSummary.precision;
    precisionMC = securityPositionSummary.precisionMC;
    securityPositionSummaryList.add(securityPositionSummary);
    groupGainLossSecurityMC += securityPositionSummary.gainLossSecurityMC;
    groupAccountValueSecurityMC += securityPositionSummary.accountValueSecurityMC;

    groupValueSecurityShort += securityPositionSummary.valueSecurity
        * (securityPositionSummary.securitycurrency.isShortSecurity() ? -1 : 1);
    groupSecurityRiskMC += securityPositionSummary.valueSecurityMC
        * (securityPositionSummary.securitycurrency.isShortSecurity() ? -1 : 1);

  }

  public double getGroupAccountValueSecurityMC() {
    return DataHelper.round(groupAccountValueSecurityMC, precisionMC);
  }

  public double getGroupGainLossSecurityMC() {
    return DataHelper.round(groupGainLossSecurityMC, precisionMC);
  }

  public double getGroupValueSecurityShort() {
    return DataHelper.round(groupValueSecurityShort, precision);
  }

  public double getGroupSecurityRiskMC() {
    return DataHelper.round(groupSecurityRiskMC, precisionMC);
  }
  
  

}
