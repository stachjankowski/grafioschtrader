package grafioschtrader.repository;

import java.lang.annotation.Annotation;
import java.util.Set;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Lazy;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.transaction.annotation.Transactional;

import grafioschtrader.entities.Cashaccount;

public class CashaccountJpaRepositoryImpl extends BaseRepositoryImpl<Cashaccount>
    implements CashaccountJpaRepositoryCustom {

  @Autowired
  public CashaccountJpaRepository cashaccountJpaRepository;

  // @Autowired
  private TransactionJpaRepository transactionJpaRepository;

  // @Autowired
  private CurrencypairJpaRepository currencypairJpaRepository;

  @Autowired
  GlobalparametersJpaRepository globalparametersJpaRepository;

  @Autowired
  public void setTransactionJpaRepository(@Lazy final TransactionJpaRepository transactionJpaRepository) {
    this.transactionJpaRepository = transactionJpaRepository;
  }

  @Autowired
  public void setCurrencypairJpaRepository(@Lazy final CurrencypairJpaRepository currencypairJpaRepository) {
    this.currencypairJpaRepository = currencypairJpaRepository;
  }

  @Override
  @Transactional
  @Modifying
  public Cashaccount saveOnlyAttributes(final Cashaccount cashaccount, Cashaccount existingEntity,
      final Set<Class<? extends Annotation>> udatePropertyLevelClasses) {
    Cashaccount createEditCashaccount = cashaccount;
    if (existingEntity != null) {
      createEditCashaccount = existingEntity;
      createEditCashaccount.updateThis(cashaccount);
    }

    if (!createEditCashaccount.getPortfolio().getCurrency().equals(cashaccount.getCurrency())) {
      currencypairJpaRepository.findOrCreateCurrencypairByFromAndToCurrency(
          createEditCashaccount.getPortfolio().getCurrency(), cashaccount.getCurrency());
    }

    return cashaccountJpaRepository.save(createEditCashaccount);
  }

}