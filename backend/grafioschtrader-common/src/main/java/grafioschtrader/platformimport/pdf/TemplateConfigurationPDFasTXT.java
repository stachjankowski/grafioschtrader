package grafioschtrader.platformimport.pdf;

import java.time.LocalTime;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;
import java.util.Locale;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import grafioschtrader.entities.ImportTransactionTemplate;
import grafioschtrader.exceptions.DataViolationException;
import grafioschtrader.platformimport.TemplateConfiguration;

/*-
Prepares a single template, which can later be used for scanning a form.
A property consists of the FIELD name and one or more selectors.
Do not add any parameters which depends on parsing data, because it may be used for many form.
An instance should only contain the configuration of a template.


Compare on the same line to anchor the FIELD
--------------------------------------------
P   = compare previous word, also the beginning of line 
Pc = a character or word is prefixed with the FIELD 
N   = compare next word, also the end of the line
Nc = a character or word is suffixed with the FIELD 
SL = compare first word start of the same line  

Use previous and next line to anchor the FIELD
If no other selector is available for this FIELD, the number of words or numbers is counted.
---------------------------------------------- 
PL = compare first word of previous line 
NL = compare first word of next line

Table: First column property of a table must contain a R.
It counts the word which are separated by a space
A table may contain one optional property per row
-----------------------------------------------------
R = First column of a table (repeated property) 

Optional
--------
O = This attribute is optional, may be used for currency

[AAA | BBB]
(?:Börsengeschäft:|Börsentransaktion:)


*/
public class TemplateConfigurationPDFasTXT extends TemplateConfiguration {

  /**
   * Matches a property like {transType|P|N}
   */
  private static final Pattern templatePropertyMatcher = Pattern.compile("(\\{[^\\{\\}]*\\})");

  /**
   * Can be everything but space
   */
  private String stringTypeRegex = "[^\\s]*";

  private List<PropertyWithOptionsConfiguration> propertyOptionsList = new ArrayList<>();

  private String[] templateLines;

  public TemplateConfigurationPDFasTXT(ImportTransactionTemplate importTransactionTemplate, Locale userLocale) {
    super(importTransactionTemplate, userLocale);
  }

  @Override
  protected void readTemplateProperties(String[] templateLines, int startRowConfig,
      DataViolationException dataViolationException) {
    this.templateLines = templateLines;
    for (int i = 0; i <= startRowConfig - 1; i++) {
      createRowPropertiesPattern(i, startRowConfig - 1, dataViolationException);
    }
  }

  /**
   * For each Line
   * 
   * @param startRow
   */
  private void createRowPropertiesPattern(int startRow, int lastLine, DataViolationException dataViolationException) {
    String[] rowSplitSpace = templateLines[startRow].split("\\s+(?![^\\[]*\\])");

    Matcher matcher = templatePropertyMatcher.matcher(templateLines[startRow]);
    while (matcher.find()) {
      // Every property with Options like {date|P|N}
      String propertyWithOptionsAndBraces = matcher.group(1);

      String propertyOptionsString = propertyWithOptionsAndBraces.substring(1,
          propertyWithOptionsAndBraces.length() - 1);

      String[] propertyOptionsSplit = propertyOptionsString.split(Pattern.quote("|"));
      String fieldName = propertyOptionsSplit[0];

      int propteryColumn = this.getColumnOfPropertyInRow(rowSplitSpace, propertyOptionsString);

      Class<?> dataType = propertyDataTypeMap.get(fieldName);
      PropertyWithOptionsConfiguration propertyWithOptions = new PropertyWithOptionsConfiguration(fieldName, dataType,
          addBraces(getValuePattern(dataType)), startRow, propteryColumn);
      propertyOptionsList.add(propertyWithOptions);

      for (int i = 1; i < propertyOptionsSplit.length; i++) {
        switch (propertyOptionsSplit[i]) {
        case "P":
          propertyWithOptions.prevRegex = getPrevStringPattern(rowSplitSpace, propteryColumn);
          break;
        case "N":
          propertyWithOptions.nextRegex = getNextStringPattern(rowSplitSpace, propteryColumn);
          break;
        case "Pc":
          propertyWithOptions.prevConcatenatedString = getPrevConcatenatedString(rowSplitSpace, propteryColumn,
              propertyWithOptionsAndBraces);
          break;
        case "Nc":
          propertyWithOptions.nextConcatenatedString = getNextConcatenatedString(rowSplitSpace, propteryColumn,
              propertyWithOptionsAndBraces);
          System.out.println(propertyWithOptions.nextConcatenatedString);
          break;
        case "PL":
          if (startRow > 0) {
            String[] rowSplitSpacePL = templateLines[startRow - 1].split("\\s+", 2);
            propertyWithOptions.startPL = setFirstWord(rowSplitSpacePL, propertyWithOptionsAndBraces,
                dataViolationException, propertyOptionsSplit[i], 1);
          } else {
            dataViolationException.addDataViolation(propertyWithOptionsAndBraces, "gt.imptemplate.pl.row", "PL");
          }
          break;
        case "SL":
          propertyWithOptions.startSL = setFirstWord(rowSplitSpace, propertyWithOptionsAndBraces,
              dataViolationException, propertyOptionsSplit[i], 2);
          break;
        case "NL":
          if (startRow < lastLine) {
            String[] rowSplitSpaceNL = templateLines[startRow + 1].split("\\s+", 2);
            propertyWithOptions.startNL = setFirstWord(rowSplitSpaceNL, propertyWithOptionsAndBraces,
                dataViolationException, propertyOptionsSplit[i], 1);
          } else {
            dataViolationException.addDataViolation(propertyWithOptionsAndBraces, "gt.imptemplate.pl.row", "NL");
          }
          break;
        case "R":
          propertyWithOptions.firstColumnTable = true;
          break;
        case "O":
          propertyWithOptions.optional = true;
          break;
        }
      }
      propertyWithOptions.createRegex();

    }
  }

  private String setFirstWord(String[] rowSplitSpace, String propertyWithOptionsAndBraces,
      DataViolationException dataViolationException, String propertyOption, int requiredWords) {
    if (rowSplitSpace.length >= requiredWords) {
      return rowSplitSpace[0];
    } else {
      dataViolationException.addDataViolation(propertyWithOptionsAndBraces, "gt.imptemplate.line.beginning",
          propertyOption);
    }
    return null;
  }

  private String getValuePattern(Class<?> dataType) {
    String typeRegext = null;
    if (String.class == dataType) {
      typeRegext = stringTypeRegex;
    } else if (Double.class == dataType || Integer.class == dataType) {
      typeRegext = numberTypeRegex;
    } else if (Date.class == dataType) {
      typeRegext = dateTypeRegex;
    } else if (LocalTime.class == dataType) {
      typeRegext = timeTypeRegex;
    }

    return typeRegext;
  }

  private int getColumnOfPropertyInRow(String[] rowSplitSpace, String propertyOptionsString) {
    for (int i = 0; i < rowSplitSpace.length; i++) {
      if (rowSplitSpace[i].contains(propertyOptionsString)) {
        return i;
      }
    }
    return -1;
  }

  private String getPrevConcatenatedString(String[] rowSplitSpace, int propertyColum,
      String propertyWithOptionsAndBraces) {
    String fullWord = rowSplitSpace[propertyColum];
    return Pattern.quote(fullWord.substring(0, fullWord.indexOf(propertyWithOptionsAndBraces)));
  }

  private String getNextConcatenatedString(String[] rowSplitSpace, int propertyColum,
      String propertyWithOptionsAndBraces) {
    String fullWord = rowSplitSpace[propertyColum];
    return Pattern.quote(
        fullWord.substring(fullWord.indexOf(propertyWithOptionsAndBraces) + propertyWithOptionsAndBraces.length()));
  }

  private String getPrevStringPattern(String[] rowSplitSpace, int propertyColum) {
    if (propertyColum == 0) {
      // Property is at the beginning of the line
      return "^";
    } else {
      if (rowSplitSpace[propertyColum - 1].startsWith("(?:") && rowSplitSpace[propertyColum - 1].endsWith(")")) {
        return rowSplitSpace[propertyColum - 1] + "\\s+";
      } else {
        return Pattern.quote(rowSplitSpace[propertyColum - 1]) + "\\s+";
      }
    }
  }

  private String getNextStringPattern(String[] rowSplitSpace, int propertyColum) {
    if (propertyColum == rowSplitSpace.length - 1) {
      // Property is at the of the line
      return "$";
    } else {
      return "\\s+" + Pattern.quote(rowSplitSpace[propertyColum + 1]);
    }
  }

  private String addBraces(String regex) {
    return "(" + regex + ")";
  }

  public List<PropertyWithOptionsConfiguration> getPropertyWithOptionsConfiguration() {
    return this.propertyOptionsList;
  }

  public int getColumnNoOnProperty(PropertyWithOptionsConfiguration property) {
    return templateLines[property.getLineNo()].split("\\s+").length;
  }

  @Override
  public ImportTransactionTemplate getImportTransactionTemplate() {
    return importTransactionTemplate;
  }

}
