/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */

package grafioschtrader.entities;

import java.io.Serializable;

import javax.persistence.Basic;
import javax.persistence.Column;
import javax.persistence.DiscriminatorValue;
import javax.persistence.Entity;
import javax.persistence.NamedAttributeNode;
import javax.persistence.NamedEntityGraph;
import javax.persistence.Table;
import javax.validation.constraints.NotNull;
import javax.xml.bind.annotation.XmlRootElement;

import com.fasterxml.jackson.annotation.JsonIgnore;

import grafioschtrader.GlobalConstants;
import grafioschtrader.common.PropertySelectiveUpdatableOrWhenNull;
import grafioschtrader.validation.ValidCurrencyCode;

/**
 *
 * @author Hugo Graf
 */
@Entity
@Table(name = Currencypair.TABNAME)
@DiscriminatorValue("C")
@XmlRootElement
@NamedEntityGraph(name = "graph.currency.historyquote", attributeNodes = @NamedAttributeNode("historyquoteList"))
public class Currencypair extends Securitycurrency<Currencypair> implements Serializable {

  public static final String TABNAME = "currencypair";

  private static final long serialVersionUID = 1L;

  @Basic(optional = false)
  @NotNull
  @ValidCurrencyCode
  @Column(name = "from_currency")
  @PropertySelectiveUpdatableOrWhenNull
  private String fromCurrency;

  @Basic(optional = false)
  @NotNull
  @ValidCurrencyCode
  @Column(name = "to_currency")
  @PropertySelectiveUpdatableOrWhenNull
  private String toCurrency;

  public Currencypair() {
  }

  public Currencypair(String fromCurrency, String toCurrency) {
    this.fromCurrency = fromCurrency;
    this.toCurrency = toCurrency;
  }

  public String getFromCurrency() {
    return fromCurrency;
  }

  public void setFromCurrency(String fromCurrency) {
    this.fromCurrency = fromCurrency;
  }

  public String getToCurrency() {
    return toCurrency;
  }

  public void setToCurrency(String toCurrency) {
    this.toCurrency = toCurrency;
  }

  public boolean getIsCryptocurrency() {
    return GlobalConstants.CRYPTO_CURRENCY_SUPPORTED.contains(fromCurrency)
        || GlobalConstants.CRYPTO_CURRENCY_SUPPORTED.contains(toCurrency);
  }

  @Override
  @JsonIgnore
  public String getName() {
    return fromCurrency + "/" + toCurrency;
  }

  @Override
  public String toString() {
    return "Currencypair [fromCurrency=" + fromCurrency + ", toCurrency=" + toCurrency + ", idSecuritycurrency="
        + idSecuritycurrency + ", idConnectorHistory=" + idConnectorHistory + ", note=" + note + ", idConnectorIntra="
        + idConnectorIntra + ", retryHistoryLoad=" + retryHistoryLoad + ", retryIntraLoad=" + retryIntraLoad
        + ", sPrevClose=" + sPrevClose + ", sChangePercentage=" + sChangePercentage + ", sTimestamp=" + sTimestamp
        + ", sOpen=" + sOpen + ", sLast=" + sLast + "]";
  }

}
