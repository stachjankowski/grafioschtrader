package grafioschtrader.reportviews.securitydividends;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import grafioschtrader.entities.Historyquote;
import grafioschtrader.entities.Security;
import grafioschtrader.reportviews.DateTransactionCurrencypairMap;
import grafioschtrader.reportviews.MapGroup;
import grafioschtrader.reportviews.SecurityCostGroup;

/**
 * Represent a year of the dividends report.
 * 
 * @author Hugo Graf
 *
 */
public class SecurityDividendsYearGroup extends MapGroup<Integer, SecurityDividendsPosition> {

  public Integer year;
  public double valueAtEndOfYearMC;
  public double yearInterestMC;
  public double yearFeeMC;
  public double yearAutoPaidTaxMC;
  public double yearTaxableAmountMC;
  public int yearCountPaidTransactions;
  public double yearRealReceivedDivInterestMC;
  public SecurityCostGroup securityCostGroup = new SecurityCostGroup();

  public SecurityDividendsYearGroup(Integer year) {
    super(new HashMap<>());
    this.year = year;
  }

  public void calcDivInterest() {
    groupMap.values().forEach(securityDividendsPosition -> {
      if (securityDividendsPosition.valueAtEndOfYearMC != null) {
        valueAtEndOfYearMC += securityDividendsPosition.valueAtEndOfYearMC;
      }
    });

  }

  @Override
  protected SecurityDividendsPosition createInstance(Integer key) {
    return new SecurityDividendsPosition(key);
  }

  public List<SecurityDividendsPosition> getSecurityDividendsPositions() {
    return groupMap.values().stream().sorted((x, y) -> x.security.getName().compareTo(y.security.getName()))
        .collect(Collectors.toList());
  }

  public SecurityDividendsPosition getOrCreateSecurityDividendsPosition(Security security) {
    SecurityDividendsPosition securityDividendsPosition = this.getOrCreateGroup(security.getIdSecuritycurrency());
    securityDividendsPosition.security = security;
    return securityDividendsPosition;
  }

  public void attachHistoryquoteAndCalcPositionTotal(Map<Integer, Map<Integer, Historyquote>> historyquoteYearIdMap,
      DateTransactionCurrencypairMap dateCurrencyMap) {

    groupMap.values().forEach(securityDividendsPosition -> {
      securityDividendsPosition.attachHistoryquoteAndCalcPositionTotal(historyquoteYearIdMap.get(year),
          dateCurrencyMap);
      yearCountPaidTransactions += securityDividendsPosition.countPaidTransactions;
      yearRealReceivedDivInterestMC += securityDividendsPosition.realReceivedDivInterestMC;
      yearAutoPaidTaxMC += securityDividendsPosition.autoPaidTaxMC;
      yearTaxableAmountMC += securityDividendsPosition.taxableAmountMC;
    });
    securityCostGroup.calcAverages(yearCountPaidTransactions);
  }

  public void adjustUnits(Map<Integer, UnitsCounter> unitsCounterBySecurityMap) {
    for (Map.Entry<Integer, UnitsCounter> entry : unitsCounterBySecurityMap.entrySet()) {
      SecurityDividendsPosition securityDividendsPosition = groupMap.get(entry.getKey());
      if (securityDividendsPosition == null && entry.getValue().units != 0) {
        securityDividendsPosition = this.getOrCreateSecurityDividendsPosition(entry.getValue().security);
      }
      if (securityDividendsPosition != null) {
        securityDividendsPosition.unitsAtEndOfYear = entry.getValue().units;
      }
    }
  }

  public void addInterest(Double interestMC) {
    if (interestMC != null) {
      yearInterestMC += interestMC;
    }

  }

  public void addFee(Double feeMC) {
    if (feeMC != null) {
      yearFeeMC += feeMC;
    }

  }

}