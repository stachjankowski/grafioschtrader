package grafioschtrader.repository;

import java.util.List;
import java.util.Map;

import grafioschtrader.dto.SecuritysplitDeleteAndCreateMultiple;
import grafioschtrader.entities.Securitysplit;

public interface SecuritysplitJpaRepositoryCustom {

  Map<Integer, List<Securitysplit>> getSecuritysplitMapByIdSecuritycashaccount(Integer idSecuritycashaccount);

  Map<Integer, List<Securitysplit>> getSecuritysplitMapByIdWatchlist(Integer idWatchlist);

  Map<Integer, List<Securitysplit>> getSecuritysplitMapByIdSecuritycurrency(Integer idSecuritycurrency);

  Map<Integer, List<Securitysplit>> getSecuritysplitMapByIdTenant(Integer idTenant);

  List<Securitysplit> deleteAndCreateMultiple(
      SecuritysplitDeleteAndCreateMultiple securitysplitDeleteAndCreateMultiple);
}
