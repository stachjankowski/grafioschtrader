package grafioschtrader.task.exec;

import java.util.Arrays;
import java.util.Optional;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import grafioschtrader.entities.Security;
import grafioschtrader.repository.SecurityJpaRepository;
import grafioschtrader.task.ITask;
import grafioschtrader.types.TaskType;


@Component
public class SecurityLoadHistoricalIntraPriceDataTask implements ITask {

  @Autowired
  SecurityJpaRepository securityJpaRepository;

  
  @Override
  public TaskType getTaskType() {
    return  TaskType.SECURITY_LOAD_HISORICAL_INTRA_PRICE_DATA;
  }

  @Override
  @Transactional
  public void doWork(Integer idEntity, String entity) {
    Optional<Security> securityOpt = securityJpaRepository.findById(idEntity);
    if(securityOpt.isPresent()) {
      Security security = securityJpaRepository.rebuildSecurityCurrencypairHisotry(securityOpt.get());
     securityJpaRepository.updateLastPriceByList(Arrays.asList(security));
    }
  }
 
}