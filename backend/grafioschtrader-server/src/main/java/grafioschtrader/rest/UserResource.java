package grafioschtrader.rest;

import static org.springframework.http.MediaType.APPLICATION_JSON_VALUE;

import java.util.Calendar;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import grafioschtrader.dto.ChangePasswortDTO;
import grafioschtrader.dto.UserDTO;
import grafioschtrader.entities.User;
import grafioschtrader.entities.VerificationToken;
import grafioschtrader.entities.projection.SuccessfullyChanged;
import grafioschtrader.entities.projection.UserOwnProjection;
import grafioschtrader.repository.UserJpaRepository;
import grafioschtrader.repository.VerificationTokenJpaRepository;
import grafioschtrader.service.UserService;

/**
 * Every user can access and edit some of its user data.
 * 
 * @author Hugo Graf
 *
 */
@RestController
@RequestMapping(RequestMappings.USER_MAP)
public class UserResource {
  public static final String TOKEN_EXPIRED = "TOKEN_EXPIRED";
  public static final String TOKEN_SUCCESS = "TOKEN_SUCCESS";
  public static final String TOKEN_INVALID = "TOKEN_INVALID";
  private final Logger log = LoggerFactory.getLogger(this.getClass());

  @Autowired
  UserService userService;

  @Autowired
  VerificationTokenJpaRepository verificationTokenJpaRepository;

  @Autowired
  UserJpaRepository userJpaRepository;
  
  @Value("${gt.demo.account.pattern}")
  private String demoAccountPattern;
  

  @GetMapping(value = "/own", produces = APPLICATION_JSON_VALUE)
  public ResponseEntity<UserOwnProjection> getOwnUser() {
    User user = (User) SecurityContextHolder.getContext().getAuthentication().getDetails();
    return new ResponseEntity<>(userJpaRepository.findByIdUserAndIdTenant(user.getIdUser(), user.getIdTenant()),
        HttpStatus.OK);
  }

  @PostMapping(value = "/", produces = APPLICATION_JSON_VALUE)
  public ResponseEntity<User> createUserForVerification(@RequestBody final UserDTO userDTO,
      @RequestHeader final HttpHeaders headers) {
    log.debug("Create User: {}", userDTO);
    String referer = headers.get("referer").get(0).replace("/api", "");
    return ResponseEntity.ok()
        .body(userService.createUserForVerification(userDTO, referer.substring(0, referer.lastIndexOf('/'))));
  }

  @PutMapping(value = "/", produces = APPLICATION_JSON_VALUE)
  public ResponseEntity<User> updateButPassword(@RequestBody final UserDTO userDTO) {
    log.debug("Update User: {}", userDTO);
    return ResponseEntity.ok().body(userService.updateButPassword(userDTO));
  }

  @PutMapping(value = "/nicknamelocale", produces = APPLICATION_JSON_VALUE)
  public ResponseEntity<SuccessfullyChanged> updateNicknameLocal(
      @RequestBody final UserOwnProjection userOwnProjection) {
    return ResponseEntity.ok().body(userService.updateNicknameLocal(userOwnProjection));
  }

  @PutMapping(value = "/password", produces = APPLICATION_JSON_VALUE)
   public ResponseEntity<SuccessfullyChanged> changePassword(@RequestBody final ChangePasswortDTO changePasswortDTO) {
    return ResponseEntity.ok().body(userService.changePassword(changePasswortDTO));
  }

  @GetMapping(value = "/tokenverify/{token}", produces = APPLICATION_JSON_VALUE)
  public ResponseEntity<String> tokenverify(@PathVariable final String token) {
    final VerificationToken verificationToken = verificationTokenJpaRepository.findByToken(token);
    String redirect = TOKEN_INVALID;
    if (verificationToken != null) {
      final User user = verificationToken.getUser();
      final Calendar cal = Calendar.getInstance();

      if ((verificationToken.getExpiryDate().getTime() - cal.getTime().getTime()) <= 0) {
        redirect = TOKEN_EXPIRED;
      } else {
        user.setEnabled(true);
        userJpaRepository.save(user);
        verificationTokenJpaRepository.delete(verificationToken);
        redirect = TOKEN_SUCCESS;
      }
    }
    return new ResponseEntity<>(redirect, HttpStatus.OK);
  }

}