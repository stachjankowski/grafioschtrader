package grafioschtrader.connector.instrument.stockworld;

import java.text.NumberFormat;
import java.text.ParseException;
import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Calendar;
import java.util.Date;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

import org.jsoup.Connection;
import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.jsoup.nodes.Element;
import org.jsoup.select.Elements;
import org.springframework.stereotype.Component;

import grafioschtrader.connector.instrument.BaseFeedConnector;
import grafioschtrader.entities.Historyquote;
import grafioschtrader.entities.Security;

/*-
 * Stock, Bond, ETF:
 *  
 * 
 * Dividend: Not Supported 
 * Splits: Not Supported 
 *
 *
 */
@Component
public class StockworldFeedConnector extends BaseFeedConnector {

  private static Map<FeedSupport, FeedIdentifier[]> supportedFeed;

  static {
    supportedFeed = new HashMap<>();
    supportedFeed.put(FeedSupport.HISTORY, new FeedIdentifier[] { FeedIdentifier.SECURITY_URL });
    supportedFeed.put(FeedSupport.INTRA, new FeedIdentifier[] { FeedIdentifier.SECURITY_URL });
  }

  public StockworldFeedConnector() {
    super(supportedFeed, "stockworld", "Stockworld");
  }

  @Override
  public String getSecurityHistoricalDownloadLink(final Security security) {
    return "http://www.stock-world.de/detail/" + security.getUrlHistoryExtend() + "-Historisch.html";
  }

  @Override
  public List<Historyquote> getEodSecurityHistory(final Security security, final Date from, final Date to)
      throws Exception {

    final NumberFormat numberFormat = NumberFormat.getNumberInstance(Locale.GERMAN);
    final SimpleDateFormat dateFormat = new SimpleDateFormat("dd.MM.yy"); //$NON-NLS-1$
    final List<Historyquote> historyquotes = new ArrayList<>();
    /**
     * Sometimes some rows can come two times when requesting a page
     */
    final Set<Date> historyquoteDateSet = new HashSet<>();

    int pageCounter = 0;
    int lastPage = 0;
    Date date = null;
    do {

      final Connection stockWorldConnection = Jsoup
          .connect(getSecurityHistoricalDownloadLink(security) + "?page=" + pageCounter++);

      final Document doc = stockWorldConnection.get();

      final Element table = doc.select("table").get(1);
      final Elements rows = table.select("tr");
      if (lastPage == 0) {
        lastPage = scanLastPage(rows);
      }

      for (int i = 1; i < rows.size() - 2; i++) {

        final Element row = rows.get(i);
        final Elements cols = row.select("td");
        date = dateFormat.parse(cols.get(1).text());

        if (!date.after(to) && !date.before(from)) {
          if (!historyquoteDateSet.contains(date)) {
            historyquoteDateSet.add(date);

            final Historyquote historyquote = new Historyquote();

            historyquote.setDate(date);

            final Double open = parseDouble(numberFormat, 2, cols);
            if (open != null) {
              historyquote.setOpen(open);
            }

            final Double low = parseDouble(numberFormat, 3, cols);
            if (low != null) {
              historyquote.setLow(low);
            }

            final Double high = parseDouble(numberFormat, 4, cols);
            if (high != null) {
              historyquote.setLow(high);
            }

            final Double close = parseDouble(numberFormat, 5, cols);
            if (close != null) {
              historyquote.setClose(close);
            }

            historyquotes.add(historyquote);
          }
        }
      }

    } while (pageCounter < lastPage && !date.before(from));

    return historyquotes;
  }

  private int scanLastPage(final Elements rows) {
    final String lastRow = rows.get(rows.size() - 1).text();

    final String[] pageIndex = lastRow.split(" ");
    for (int i = pageIndex.length - 1; i > 0; i--) {
      if (Character.isDigit(pageIndex[i].trim().charAt(0))) {
        return Integer.parseInt(pageIndex[i].trim());
      }
    }
    return 0;
  }

  private Double parseDouble(final NumberFormat numberFormat, final int column, final Elements cols) {
    Number number = parseNumber(numberFormat, column, cols);
    return number == null ? null : number.doubleValue();
  }

  private Number parseNumber(final NumberFormat numberFormat, final int column, final Elements cols) {
    String text = cols.get(column).text().replace("%", "").replace("+", "").trim();
    if (!text.isEmpty() && !text.equals("-")) {
      try {
        return numberFormat.parse(text);
      } catch (ParseException e) {
        e.printStackTrace();
      }
    }
    return null;
  }

  @Override
  public String getSecurityIntradayDownloadLink(final Security security) {
    return "http://www.stock-world.de/detail/index.m?secu=" + security.getUrlIntraExtend();
  }

  @Override
  public int getIntradayDelayedSeconds() {
    return 900;
  }

  @Override
  public void updateSecurityLastPrice(final Security security) throws Exception {
    final NumberFormat numberFormat = NumberFormat.getNumberInstance(Locale.GERMAN);
    final Connection stockworldConnection = Jsoup.connect(getSecurityIntradayDownloadLink(security)).timeout(8_000);
    final Document doc = stockworldConnection.get();
    final Element table = doc.select("#inhaltALLES div table").get(1);

    final Elements rows = table.select("tr");
    final Elements cols = rows.get(2).select("td");

    security.setSLast(parseDouble(numberFormat, 1, cols));
    security.setSChangePercentage(parseDouble(numberFormat, 2, cols));
    security.setSPrevClose(parseDouble(numberFormat, 3, cols));
    String dateTime = cols.get(4).text();
    if (dateTime.contains(":")) {
      SimpleDateFormat timeFormat = new SimpleDateFormat("HH:mm");
      Date time = timeFormat.parse(dateTime);
      Calendar cal = Calendar.getInstance();
      cal.setTime(time);
      security.setSTimestamp(cal.getTime());
    } else {
      SimpleDateFormat dateFormat = new SimpleDateFormat("dd.MM.yy");
      security.setSTimestamp(dateFormat.parse(dateTime));
    }

  }

}