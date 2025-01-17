package grafioschtrader.algo.strategy.model.alerts;

import javax.validation.constraints.Max;
import javax.validation.constraints.Min;

/**
 * Alert when a certain position in a portfolio gain or lose a certain
 * percentage.
 * 
 * @author Hugo Graf
 *
 */
public class HoldingGainLosePercentAlert {
  @Min(value = 1)
  @Max(value = 500)
  Integer gainPercentage;

  @Min(value = 1)
  @Max(value = 500)
  Integer losePercentage;
}
