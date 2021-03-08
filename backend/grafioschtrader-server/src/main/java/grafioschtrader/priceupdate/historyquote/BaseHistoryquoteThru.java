package grafioschtrader.priceupdate.historyquote;

import java.text.ParseException;
import java.util.ArrayList;
import java.util.Calendar;
import java.util.Date;
import java.util.List;

import org.hibernate.Hibernate;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import grafioschtrader.common.DateHelper;
import grafioschtrader.common.ThreadHelper;
import grafioschtrader.entities.Historyquote;
import grafioschtrader.entities.Security;
import grafioschtrader.entities.Securitycurrency;
import grafioschtrader.reportviews.SecuritycurrencyPositionSummary;
import grafioschtrader.repository.GlobalparametersJpaRepository;
import grafioschtrader.repository.SecurityServiceAsyncExectuion;
import grafioschtrader.repository.SecuritycurrencyService;

/*-
 *
 *
 * @param <S>
 */
public abstract class BaseHistoryquoteThru<S extends Securitycurrency<S>> implements IHistoryquoteLoad<S> {

  protected final GlobalparametersJpaRepository globalparametersJpaRepository;
  private final IHistoryqouteEntityBaseAccess<S> historyqouteEntityBaseAccess;

  private final Logger log = LoggerFactory.getLogger(this.getClass());

  protected abstract List<S> fillEmptyHistoryquote();

  public BaseHistoryquoteThru(GlobalparametersJpaRepository globalparametersJpaRepository,
      IHistoryqouteEntityBaseAccess<S> historyqouteEntityBaseAccess) {
    this.globalparametersJpaRepository = globalparametersJpaRepository;
    this.historyqouteEntityBaseAccess = historyqouteEntityBaseAccess;
  }

  @Override
  public List<S> catchAllUpSecuritycurrencyHistoryquote() {
    final List<S> catchUp = fillEmptyHistoryquote();
    catchUp.addAll(particialFillHistoryquote());
    return catchUp;
  }

  @Override
  public <U extends SecuritycurrencyPositionSummary<S>> void reloadAsyncFullHistoryquote(
      final SecurityServiceAsyncExectuion<S, U> securityServiceAsyncExectuion,
      final SecuritycurrencyService<S, U> securitycurrencyService, final S securitycurrency) {
   
    Hibernate.initialize(securitycurrency.getHistoryquoteList());
    securityServiceAsyncExectuion.asyncLoadHistoryIntraData(securitycurrencyService, securitycurrency, true,
        globalparametersJpaRepository.getMaxIntraRetry(),
        globalparametersJpaRepository.getSecurityCurrencyIntradayUpdateTimeout());
  }

  /**
   * For all securities and currencies it fills their history quote from the
   * youngest entry date until now.
   * 
   * @return
   */
  private List<S> particialFillHistoryquote() {

    final Calendar currentCalendar = DateHelper.getCalendar(new Date());

    if (currentCalendar.get(Calendar.DAY_OF_WEEK) == Calendar.SUNDAY
        || currentCalendar.get(Calendar.DAY_OF_WEEK) == Calendar.MONDAY) {
      currentCalendar.add(Calendar.DATE, currentCalendar.get(Calendar.DAY_OF_WEEK) * -1);
    }
    final List<SecurityCurrencyMaxHistoryquoteData<S>> historySecurityCurrencyList = historyqouteEntityBaseAccess
        .getMaxHistoryquoteResult(globalparametersJpaRepository.getMaxHistoryRetry(), this);
 
    return fillHistoryquoteForSecuritiesCurrencies(historySecurityCurrencyList, currentCalendar);
  }

  @Override
  public List<S> fillHistoryquoteForSecuritiesCurrencies(
      List<SecurityCurrencyMaxHistoryquoteData<S>> historySecurityCurrencyList, final Calendar currentCalendar) {
    final List<S> catchUp = new ArrayList<>();

    ThreadHelper.executeForkJoinPool(() -> historySecurityCurrencyList.parallelStream()
        .forEach(queryObject -> catchUpHistoryquote(queryObject, currentCalendar, catchUp)), 4);

    return catchUp;
  }

  protected List<S> catchUpEmptyHistoryquote(List<S> historySecurityCurrencyList) {
    final List<S> catchUp = new ArrayList<>();
    ThreadHelper.executeForkJoinPool(() -> historySecurityCurrencyList.parallelStream().forEach(securitycurrency -> {
      log.info("Create history quote for securitycurrency={}", securitycurrency);
      final S execSecuritycurrency = historyqouteEntityBaseAccess.catchUpSecurityCurrencypairHisotry(securitycurrency,
          null, null);
      if (execSecuritycurrency.getRetryHistoryLoad() == 0) {
        catchUp.add(execSecuritycurrency);
      }
    }), 4);
    return catchUp;
  }

  protected void addHistoryquotesToSecurity(S securitycurrency, List<Historyquote> historyquotes, Date fromDate,
      Date toDate) {
    if (securitycurrency.getHistoryquoteList() == null || securitycurrency.getHistoryquoteList().isEmpty()) {
      securitycurrency.setHistoryquoteList(historyquotes);
    } else {
      for (final Historyquote historyquote : historyquotes) {
        securitycurrency.getHistoryquoteList().add(historyquote);
      }
    }

    if (fromDate == null && toDate == null) {
      securitycurrency.setFullLoadTimestamp(new Date(System.currentTimeMillis()));
    }
  }

  protected Date getCorrectedFromDate(final S securitycurrency, final Date fromDate) throws ParseException {
    if (fromDate == null) {
      return securitycurrency instanceof Security ? ((Security) securitycurrency).getActiveFromDate()
          : this.globalparametersJpaRepository.getStartFeedDate();
    } else {
      return fromDate;
    }
  }

  private void catchUpHistoryquote(final SecurityCurrencyMaxHistoryquoteData<S> queryObject,
      final Calendar currentCalendar, final List<S> catchUp) {
    final S securitycurrency = queryObject.getSecurityCurrency();
    final Calendar lastQuoteCalendar = DateHelper.getCalendar(queryObject.getDate());
    final int diffInDays = (int) ((currentCalendar.getTimeInMillis() - lastQuoteCalendar.getTimeInMillis())
        / (1000 * 60 * 60 * 24));

    if (diffInDays > 1) {
      log.info("Catchup historyquote, missing Days: diffInDays={} for Security/Currency securitycurrency={}",
          diffInDays, securitycurrency);
      lastQuoteCalendar.add(Calendar.DATE, 1);
      final S execSecuritycurrency = historyqouteEntityBaseAccess.catchUpSecurityCurrencypairHisotry(securitycurrency,
          lastQuoteCalendar.getTime(), currentCalendar.getTime());
      if (execSecuritycurrency.getRetryHistoryLoad() == 0) {
        catchUp.add(execSecuritycurrency);
      }
    }
  }

}