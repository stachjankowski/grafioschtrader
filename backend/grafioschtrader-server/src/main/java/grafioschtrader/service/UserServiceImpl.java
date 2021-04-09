package grafioschtrader.service;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.context.MessageSource;
import org.springframework.security.authentication.AccountStatusUserDetailsChecker;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;

import grafioschtrader.dto.ChangePasswortDTO;
import grafioschtrader.dto.UserDTO;
import grafioschtrader.entities.Role;
import grafioschtrader.entities.User;
import grafioschtrader.entities.projection.SuccessfullyChanged;
import grafioschtrader.entities.projection.UserOwnProjection;
import grafioschtrader.exceptions.DataViolationException;
import grafioschtrader.exceptions.RequestLimitAndSecurityBreachException;
import grafioschtrader.registration.OnRegistrationCompleteEvent;
import grafioschtrader.repository.GlobalparametersJpaRepository;
import grafioschtrader.repository.RoleJpaRepository;
import grafioschtrader.repository.UserJpaRepository;
import grafioschtrader.rest.helper.RestHelper;
import grafioschtrader.security.UserRightLimitCounter;

@Service
public class UserServiceImpl implements UserService {

  private final MessageSource messages;

 
  @Autowired
  private ApplicationEventPublisher eventPublisher;

  @Value("${gt.main.user.admin.mail}")
  private String mainUserAdminMail;
  
  
  @Value("${gt.allowed.users}")
  private int allowedUsers;
  
  @Value("${gt.demo.account.pattern.de}")
  private String demoAccountPatternDE;
 
  @Value("${gt.demo.account.pattern.en}")
  private String demoAccountPatternEN;
 
  
  private final UserJpaRepository userJpaRepository;

  private final RoleJpaRepository roleJpaRepository;

  private final GlobalparametersJpaRepository globalparametersJpaRepository;

  @Autowired
  public UserServiceImpl(final UserJpaRepository userJpaRepository, final RoleJpaRepository roleJpaRepository,
      final MessageSource messages, GlobalparametersJpaRepository globalparametersJpaRepository) {
    this.userJpaRepository = userJpaRepository;
    this.roleJpaRepository = roleJpaRepository;
    this.messages = messages;
    this.globalparametersJpaRepository = globalparametersJpaRepository;
  }

  /**
   * It is called with every request!
   */
  @Override
  public UserDetails loadUserByUsername(final String username) throws UsernameNotFoundException {
    final User user = userJpaRepository.findByEmail(username).orElse(null);
    if (user != null) {
      new AccountStatusUserDetailsChecker().check(user);
    } else {
      throw new UsernameNotFoundException("user not found.");
    }
    return user;
  }

  @Override
  public UserDetails loadUserByUserIdAndCheckUsername(final Integer idUser, final String username) {
    final User user = userJpaRepository.findById(idUser).orElse(null);
    if (user != null && user.getUsername().equals(username)) {
      new AccountStatusUserDetailsChecker().check(user);
      checkUserLimits(user);
    } else {
      throw new UsernameNotFoundException("user not found.");
    }
    return user;
  }

  @Override
  public void checkUserLimits(User user) {
    if (user.getLimitRequestExceedCount() > globalparametersJpaRepository.getMaxLimitExceededCount()) {
      throw new RequestLimitAndSecurityBreachException(
          messages.getMessage("limit.request.exceeded", null, user.createAndGetJavaLocale()),
          User.LIMIT_REQUEST_EXCEED_COUNT);
    }
    if (user.getSecurityBreachCount() > globalparametersJpaRepository.getMaxSecurityBreachCount()) {
      throw new RequestLimitAndSecurityBreachException(
          messages.getMessage("limit.security.breach.exceeded", null, user.createAndGetJavaLocale()),
          User.SECURITY_BREACH_COUNT);
    }
  }

  @Override
  public User updateButPassword(final UserDTO params) {
    final User user = (User) SecurityContextHolder.getContext().getAuthentication().getDetails();
    params.getEmail().ifPresent(user::setUsername);
    params.getEncodedPassword().ifPresent(user::setPassword);
    params.getNickname().ifPresent(user::setNickname);
    return userJpaRepository.save(user);
  }

  @Override
  public Optional<User> findUser(final Integer id) {
    return Optional.of(userJpaRepository.getOne(id));

  }

  @Override
  public User createUserForVerification(final UserDTO userDTO, final String hostNameAndBaseName) {
    checkApplExeedsUserLimit(userDTO.getLocaleStr());
    // Unique
    Optional<User> user = userJpaRepository.findByEmail(userDTO.getEmail().get());
    if (user.isPresent()) {
      throw new DataViolationException("email", "email.already.used", userDTO.getEmail().get(), userDTO.getLocaleStr());
    }
    user = userJpaRepository.findByNickname(userDTO.getNickname().get());
    if (user.isPresent()) {
      throw new DataViolationException("nickname", "nickname.already.used", userDTO.getNickname().get(),
          userDTO.getLocaleStr());
    }
    final User newUser = createUser(userDTO);
    eventPublisher.publishEvent(new OnRegistrationCompleteEvent(newUser, hostNameAndBaseName));
    return newUser;
  }
  
  private void checkApplExeedsUserLimit(String localeStr) {
    if(userJpaRepository.countByEnabled(true) >= allowedUsers) {
      throw new DataViolationException("applimit", "appl.exeeds.user.limit", allowedUsers, localeStr);
    }
  }

  @Override
  public User createUser(final UserDTO userDTO) {
    List<Role> roles = new ArrayList<>();
    boolean isMainUserAdmin = userDTO.getEmail().get().equals(mainUserAdminMail);
    if (isMainUserAdmin) {
      roles.add(roleJpaRepository.findByRolename(Role.ROLE_ADMIN));
      roles.add(roleJpaRepository.findByRolename(Role.ROLE_ALL_EDIT));
      roles.add(roleJpaRepository.findByRolename(Role.ROLE_USER));
      // It is not possible to give this user the id 1 when @GeneratedValue(strategy = GenerationType.IDENTITY)  is  used
    } else {
      roles.add(roleJpaRepository.findByRolename(Role.ROLE_LIMIT_EDIT));
    }
    return userJpaRepository.save(userDTO.toUser(roles));
  }

  @Override
  public User updateTimezoneOffset(final User user, final Integer timezoneOffset) {
    user.setTimezoneOffset(timezoneOffset);
    return userJpaRepository.save(user);
  }

 

  @Override
  public SuccessfullyChanged updateNicknameLocal(UserOwnProjection userOwnProjection) {
    final User user = (User) SecurityContextHolder.getContext().getAuthentication().getDetails();

    user.setNickname(userOwnProjection.nickname);
    user.checkAndSetLocaleStr(userOwnProjection.localeStr);
    userJpaRepository.save(user);
    return new SuccessfullyChanged(true,
        messages.getMessage("locale.nickname.success", null, user.createAndGetJavaLocale()));
  }

  @Override
  public SuccessfullyChanged changePassword(final ChangePasswortDTO changePasswortDTO) {
    final BCryptPasswordEncoder bCryptPasswordEncoder = new BCryptPasswordEncoder();
    final User user = (User) SecurityContextHolder.getContext().getAuthentication().getDetails();
    RestHelper.isDemoAccount(demoAccountPatternDE, user.getUsername());
    RestHelper.isDemoAccount(demoAccountPatternEN, user.getUsername());

    if (bCryptPasswordEncoder.matches(changePasswortDTO.oldPassword, user.getPassword())) {
      user.setPassword(bCryptPasswordEncoder.encode(changePasswortDTO.newPassword));
      userJpaRepository.save(user);
      return new SuccessfullyChanged(true,
          messages.getMessage("password.changed.success", null, user.createAndGetJavaLocale()));
    }
    throw new DataViolationException("oldpassword", "password.changed.old.wrong", null);
  }

  @Override
  public User incrementRightsLimitCount(Integer userId, UserRightLimitCounter userRightLimitCounter) {
    User user = userJpaRepository.findById(userId).orElse(null);
    switch (userRightLimitCounter) {
    case SECURITY_BREACH:
      user.setSecurityBreachCount((short) (user.getSecurityBreachCount() + 1));
      break;
    case LIMIT_EXCEEDED_TENANT_DATA:
      user.setLimitRequestExceedCount((short) (user.getLimitRequestExceedCount() + 1));
      break;
    }
    return userJpaRepository.save(user);
  }

 
  
  
}