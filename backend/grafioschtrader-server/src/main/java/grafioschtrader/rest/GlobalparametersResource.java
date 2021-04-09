package grafioschtrader.rest;

import static org.springframework.http.MediaType.APPLICATION_JSON_VALUE;

import java.text.ParseException;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Currency;
import java.util.Date;
import java.util.List;
import java.util.Locale;
import java.util.Map.Entry;
import java.util.Properties;
import java.util.stream.Collectors;

import org.json.JSONObject;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.MessageSource;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import grafioschtrader.GlobalConstants;
import grafioschtrader.config.ExposedResourceBundleMessageSource;
import grafioschtrader.dto.TenantLimit;
import grafioschtrader.dto.ValueKeyHtmlSelectOptions;
import grafioschtrader.entities.Assetclass;
import grafioschtrader.entities.Globalparameters;
import grafioschtrader.entities.User;
import grafioschtrader.repository.GlobalparametersJpaRepository;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;

/**
 * 
 * @author Hugo Graf
 *
 */
@RestController
@RequestMapping(RequestMappings.GLOBALPARAMETERS_MAP)
@Tag(name = RequestMappings.GLOBALPARAMETERS, description = "Controller for global parameters")
public class GlobalparametersResource {

  @Autowired
  private MessageSource messageSource;

  @Autowired
  private MessageSource messages;


  @Autowired
  private GlobalparametersJpaRepository globalparametersJpaRepository;

  
  @Operation(summary = "Returns all global parameters", description = "", 
      tags = { RequestMappings.GLOBALPARAMETERS })
  @GetMapping(value = "/", produces = APPLICATION_JSON_VALUE)
  public ResponseEntity<List<Globalparameters>> getAllAssetclass() {
    return new ResponseEntity<>(globalparametersJpaRepository.findAll(), HttpStatus.OK);
  }
  
  @GetMapping(value = "/updatetimeout", produces = APPLICATION_JSON_VALUE)
  public ResponseEntity<Integer> getIntraUpdateQuotesTimeoutSeconds() {
    return new ResponseEntity<>(globalparametersJpaRepository.getWatchlistIntradayUpdateTimeout(), HttpStatus.OK);
  }

  @GetMapping(value = "/startfeeddate", produces = APPLICATION_JSON_VALUE)
  public ResponseEntity<Date> getStartFeedDate() throws ParseException {
    return new ResponseEntity<>(globalparametersJpaRepository.getStartFeedDate(), HttpStatus.OK);
  }

  @GetMapping(value = "/watchlistlength", produces = APPLICATION_JSON_VALUE)
  public ResponseEntity<Integer> getMaxWatchlistLength() {
    return new ResponseEntity<>(
        globalparametersJpaRepository.getMaxValueByKey(Globalparameters.GLOB_KEY_MAX_WATCHLIST_LENGTH), HttpStatus.OK);
  }

  @GetMapping(value = "/tenantlimits", produces = APPLICATION_JSON_VALUE)
  public ResponseEntity<List<TenantLimit>> getMaxTenantLimitsByMsgKey(
      @RequestParam() final List<String> msgKeys)  {
    return new ResponseEntity<>(globalparametersJpaRepository.getMaxTenantLimitsByMsgKeys(msgKeys), HttpStatus.OK);
  }

  @Operation(summary = "Returns the possible currencies as it can be used in html option", description = "", 
      tags = { RequestMappings.GLOBALPARAMETERS})
  @GetMapping(value = "/currencies", produces = APPLICATION_JSON_VALUE)
  public ResponseEntity<List<ValueKeyHtmlSelectOptions>> getCurrencies() {
    final User user = (User) SecurityContextHolder.getContext().getAuthentication().getDetails();
    final List<ValueKeyHtmlSelectOptions> currencies = Currency.getAvailableCurrencies().stream()
        .sorted((currency1, currency2) -> currency1.getCurrencyCode().compareTo(currency2.getCurrencyCode()))
        .map(currency -> new ValueKeyHtmlSelectOptions(currency.getCurrencyCode(), currency.getCurrencyCode()))
        .collect(Collectors.toList());
    // Add crypto currency
    GlobalConstants.CRYPTO_CURRENCY_SUPPORTED.forEach(cc -> currencies.add(new ValueKeyHtmlSelectOptions(cc,
        cc + "(" + messages.getMessage("cryptocurrency", null, user.createAndGetJavaLocale()) + ")")));

    return new ResponseEntity<>(currencies, HttpStatus.OK);
  }
  
  @Operation(summary = "Returns the possible countries as it can be used in html option", description = "", 
      tags = { RequestMappings.GLOBALPARAMETERS})
  @GetMapping(value = "/countries", produces = APPLICATION_JSON_VALUE)
  public ResponseEntity<List<ValueKeyHtmlSelectOptions>> getCountries() {
    final User user = (User) SecurityContextHolder.getContext().getAuthentication().getDetails();
    String[] locales = Locale.getISOCountries();
    List<ValueKeyHtmlSelectOptions> valueKeyHtmlSelectOptions = new ArrayList<>();
    Locale userLocale = user.createAndGetJavaLocale();
    for (String countryCode : locales) {
        Locale obj = new Locale("", countryCode);
        valueKeyHtmlSelectOptions.add(new ValueKeyHtmlSelectOptions(obj.getCountry(), obj.getDisplayCountry(userLocale)));
    }
    Collections.sort(valueKeyHtmlSelectOptions);
    return new ResponseEntity<>(valueKeyHtmlSelectOptions, HttpStatus.OK);
  }
  

  @Operation(summary = "Some language translations are provided by the backend", description = "Properties names are separated by underscore", 
      tags = { RequestMappings.GLOBALPARAMETERS})
  @GetMapping(value = "/properties/{language}", produces = APPLICATION_JSON_VALUE)
  public String getLanguageProperties(@PathVariable final String language) {
    Locale locale = Locale.forLanguageTag(language);
    Properties properties = ((ExposedResourceBundleMessageSource) messageSource).getMessages(locale);
    JSONObject jsonObject = new JSONObject();
    for (Entry<Object, Object> entry : properties.entrySet()) {
      String key =  entry.getKey().toString();
      jsonObject.put( key.startsWith("gt.")? key: key.toUpperCase().replaceAll("\\.", "_"), entry.getValue());
    }
    return jsonObject.toString();
  }

  @Operation(summary = "Returns the locales as key value properties", description = "", 
      tags = { RequestMappings.GLOBALPARAMETERS})
  @GetMapping(value = "/locales", produces = APPLICATION_JSON_VALUE)
  public ResponseEntity<List<ValueKeyHtmlSelectOptions>> getSupportedLocalesEnDe() {
    return new ResponseEntity<>(globalparametersJpaRepository.getSupportedLocales(), HttpStatus.OK);
  }
  

  @Operation(summary = "Returns the country time zones as key value pair", description = "", 
      tags = { RequestMappings.GLOBALPARAMETERS})
  @GetMapping(value = "/timezones", produces = APPLICATION_JSON_VALUE)
  public ResponseEntity<List<ValueKeyHtmlSelectOptions>> getTimezones() {
    return new ResponseEntity<>(globalparametersJpaRepository.getAllZoneIds(), HttpStatus.OK);
  }

  
}