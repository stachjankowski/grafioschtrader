package grafioschtrader.entities;

import javax.persistence.Basic;
import javax.persistence.Column;
import javax.persistence.Entity;
import javax.persistence.GeneratedValue;
import javax.persistence.GenerationType;
import javax.persistence.Id;
import javax.persistence.JoinColumn;
import javax.persistence.ManyToOne;
import javax.persistence.Table;
import javax.validation.constraints.NotBlank;
import javax.validation.constraints.Size;

import com.fasterxml.jackson.annotation.JsonIgnore;

import grafioschtrader.GlobalConstants;

@Entity
@Table(name = ImportTransactionHead.TABNAME)
public class ImportTransactionHead extends TenantBaseID {

  public static final String TABNAME = "imp_trans_head";

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  @Basic(optional = false)
  @Column(name = "id_trans_head")
  private Integer idTransactionHead;

  @JsonIgnore
  @Column(name = "id_tenant")
  private Integer idTenant;

  @JoinColumn(name = "id_securitycash_account", referencedColumnName = "id_securitycash_account")
  @ManyToOne
  private Securityaccount securityaccount;

  @Basic(optional = false)
  @NotBlank
  @Size(min = 1, max = 40)
  private String name;

  @Column(name = "note")
  @Size(max = GlobalConstants.NOTE_SIZE)
  private String note;

  public ImportTransactionHead() {
    super();
  }

  public ImportTransactionHead(Integer idTenant, Securityaccount securityaccount,
      @NotBlank @Size(min = 1, max = 40) String name, @Size(max = 1000) String note) {
    super();
    this.idTenant = idTenant;
    this.securityaccount = securityaccount;
    this.name = name;
    this.note = note;
  }

  public Integer getIdTransactionHead() {
    return idTransactionHead;
  }

  public void setIdTransactionHead(Integer idTransactionHead) {
    this.idTransactionHead = idTransactionHead;
  }

  @Override
  public Integer getIdTenant() {
    return idTenant;
  }

  @Override
  public void setIdTenant(Integer idTenant) {
    this.idTenant = idTenant;
  }

  public Securityaccount getSecurityaccount() {
    return securityaccount;
  }

  public void setSecurityaccount(Securityaccount securityaccount) {
    this.securityaccount = securityaccount;
  }

  public String getName() {
    return name;
  }

  public void setName(String name) {
    this.name = name;
  }

  public String getNote() {
    return note;
  }

  public void setNote(String note) {
    this.note = note;
  }

  @Override
  public Integer getId() {
    return this.idTransactionHead;
  }

  @Override
  public String toString() {
    return "ImportTransactionHead [idTransactionHead=" + idTransactionHead + ", idTenant=" + idTenant
        + ", securityaccount=" + securityaccount + ", name=" + name + ", note=" + note + "]";
  }

}