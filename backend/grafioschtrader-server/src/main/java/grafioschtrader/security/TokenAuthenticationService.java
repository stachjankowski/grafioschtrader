package grafioschtrader.security;

import java.io.IOException;
import java.io.PrintWriter;
import java.lang.reflect.Modifier;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;

import javax.persistence.EntityManager;
import javax.persistence.PersistenceContext;
import javax.persistence.metamodel.EntityType;
import javax.persistence.metamodel.SingularAttribute;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import javax.transaction.Transactional;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Service;

import com.fasterxml.jackson.databind.ObjectMapper;

import grafioschtrader.GlobalConstants;

@Service
public class TokenAuthenticationService {

  @Value("${gt.use.websocket}")
  private boolean useWebsockt;
  
  @Value("${gt.use.algo}")
  private boolean useAlgo;
  
  private static final String AUTH_HEADER_NAME = "x-auth-token";

  private final JwtTokenHandler jwtTokenHandler;

  @Autowired
  private ObjectMapper jacksonObjectMapper;

  @PersistenceContext
  private EntityManager entityManager;

  @Autowired
  public TokenAuthenticationService(final JwtTokenHandler jwtTokenHandler) {
    this.jwtTokenHandler = jwtTokenHandler;
  }

  public void addJwtTokenToHeader(final HttpServletResponse response, final UserAuthentication authentication)
      throws IOException {

    final UserDetails user = authentication.getDetails();
    response.addHeader(AUTH_HEADER_NAME, jwtTokenHandler.createTokenForUser(user));
    PrintWriter out = response.getWriter();
    jacksonObjectMapper.writeValue(out, getPublicEntitiesAsHtmlSelectOptions());
  }

  /**
   * Get the token from header with every request.
   * 
   * @param request
   * @return
   */
  public Authentication generateAuthenticationFromRequest(final HttpServletRequest request) {

    final String token = request.getHeader(AUTH_HEADER_NAME);
    if (token == null || token.isEmpty()) {
      return null;
    }
    return jwtTokenHandler.parseUserFromToken(token).map(UserAuthentication::new).orElse(null);
  }

  /**
   * Used to connect with Websocket.
   * 
   * @param message
   * @param accessor
   * @return
   */
  public Authentication generateAuthenticationFromStompHeader(org.springframework.messaging.Message<?> message,
      StompHeaderAccessor accessor) {

    // if (StompCommand.CONNECT.equals(accessor.getCommand())) {
    final String token = accessor.getFirstNativeHeader(AUTH_HEADER_NAME);
 
    
    if (token == null || token.isEmpty()) {
      return null;
    }
    return jwtTokenHandler.parseUserFromToken(token).map(UserAuthentication::new).orElse(null);
    // }
    // return null;

  }

  @Transactional
  public ConfigurationWithLogin getPublicEntitiesAsHtmlSelectOptions() {
    ConfigurationWithLogin configurationWithLogin = new ConfigurationWithLogin(useWebsockt, useAlgo);

    final Set<EntityType<?>> entityTypeList = entityManager.getMetamodel().getEntities();
    for (EntityType<?> entity : entityTypeList) {
      Class<?> clazz = entity.getBindableJavaType();
      if (!Modifier.isAbstract(clazz.getModifiers())) {
        SingularAttribute<?, ?> id = entity.getId(entity.getIdType().getJavaType());
        configurationWithLogin.entityNameWithKeyNameList.add(new EntityNameWithKeyName(entity.getName(), id.getName()));
      }
    }
    return configurationWithLogin;
  }
  
  static class ConfigurationWithLogin {
    public List<EntityNameWithKeyName> entityNameWithKeyNameList = new ArrayList<>();
    public boolean useWebsocket;
    public boolean useAlgo;
    public List<String> crypotcurrencies = GlobalConstants.CRYPTO_CURRENCY_SUPPORTED;
    public ConfigurationWithLogin(boolean useWebsocket, boolean useAlgo) {
      this.useWebsocket = useWebsocket;
      this.useAlgo = useAlgo;
    }
  }
  
  

  static class EntityNameWithKeyName {
    public String entityName;
    public String keyName;

    public EntityNameWithKeyName(String entityName, String keyName) {
      this.entityName = entityName;
      this.keyName = keyName;
    }

  }

}