const { ethers } = require('hardhat');
const { expect } = require('chai');

const { ZERO_ADDRESS } = require('./../helpers/constants');

const { BigNumber } = ethers;

describe('MinterRole', () => {
  let MinterRole, minterRole;
  let signers, coinbase, minter, faucet, receiver, minter2, minter3;

  before(async () => {
    signers = await ethers.getSigners();
    [coinbase, minter, faucet, receiver, minter2, minter3] = signers;

    MinterRole = await ethers.getContractFactory('MinterRoleMock');
  });

  beforeEach(async () => {
    minterRole = await MinterRole.deploy();
    await minterRole.initialize();
    await minterRole.addMinter(minter.address);
  });

  describe('manage minter accounts', () => {
    it('should add minter account', async () => {
      await minterRole.connect(coinbase).addMinter(minter2.address);

      expect(await minterRole.isMinter(minter2.address)).to.be.equal(true);
    });

    it('revert adding minter account by non-owner account', async () => {
      await expect(
        minterRole.connect(minter).addMinter(minter2.address),
      ).to.be.revertedWith('Ownable: caller is not the owner');
    });

    it('should add multiple minter accounts', async () => {
      await minterRole.connect(coinbase).addMinters([minter2.address, minter3.address]);

      expect(await minterRole.isMinter(minter2.address)).to.be.equal(true);
      expect(await minterRole.isMinter(minter3.address)).to.be.equal(true);
    });

    it('revert adding multiple minter accounts by non-owner account', async () => {
      await expect(
        minterRole.connect(minter).addMinters([minter2.address, minter3.address]),
      ).to.be.revertedWith('Ownable: caller is not the owner');
    });

    it('should remove minter account', async () => {
      await minterRole.connect(coinbase).removeMinter(minter.address);

      expect(await minterRole.isMinter(minter.address)).to.be.equal(false);
    });

    it('revert remove minter account by non-owner account', async () => {
      await expect(
        minterRole.connect(minter).removeMinter(minter.address),
      ).to.be.revertedWith('Ownable: caller is not the owner');
    });

    it('should remove multiple minter accounts', async () => {
      await minterRole.connect(coinbase).removeMinters([minter.address]);

      expect(await minterRole.isMinter(minter.address)).to.be.equal(false);
    });

    it('revert removing multiple minter accounts by non-owner account', async () => {
      await expect(
        minterRole.connect(minter).removeMinters([minter.address]),
      ).to.be.revertedWith('Ownable: caller is not the owner');
    });
  });

  describe('ownership', () => {
    it('should add minter by new owner', async () => {
      await minterRole.connect(coinbase).transferOwnership(receiver.address);
      await minterRole.connect(receiver).addMinter(minter2.address);

      expect(await minterRole.isMinter(minter2.address)).to.be.equal(true);
    });

    it('should remove minter by new owner', async () => {
      await minterRole.connect(coinbase).transferOwnership(receiver.address);
      await minterRole.connect(receiver).removeMinter(minter.address);

      expect(await minterRole.isMinter(minter.address)).to.be.equal(false);
    });

    it('revert managing minters when ownership transferred', async () => {
      await minterRole.connect(coinbase).transferOwnership(receiver.address);

      await expect(
        minterRole.connect(minter).addMinter(minter2.address),
      ).to.be.revertedWith('Ownable: caller is not the owner');

      await expect(
        minterRole.connect(minter).addMinters([minter2.address]),
      ).to.be.revertedWith('Ownable: caller is not the owner');

      await expect(
        minterRole.connect(minter).removeMinter(minter.address),
      ).to.be.revertedWith('Ownable: caller is not the owner');

      await expect(
        minterRole.connect(minter).removeMinters([minter.address]),
      ).to.be.revertedWith('Ownable: caller is not the owner');
    });

    it('revert adding minter when ownership renounced', async () => {
      await minterRole.connect(coinbase).renounceOwnership();

      await expect(
        minterRole.connect(minter).addMinter(minter2.address),
      ).to.be.revertedWith('Ownable: caller is not the owner');

      await expect(
        minterRole.connect(minter).addMinters([minter2.address]),
      ).to.be.revertedWith('Ownable: caller is not the owner');

      await expect(
        minterRole.connect(minter).removeMinter(minter.address),
      ).to.be.revertedWith('Ownable: caller is not the owner');

      await expect(
        minterRole.connect(minter).removeMinters([minter.address]),
      ).to.be.revertedWith('Ownable: caller is not the owner');
    });
  });

  describe('initAdmin', () => {
    it('should init admin', async () => {
      const adminRole = await minterRole.DEFAULT_ADMIN_ROLE();

      // the case is not valid for previos version of MinterRole contract
      expect(await minterRole.hasRole(adminRole, coinbase.address)).to.be.equal(true);

      await minterRole.connect(coinbase).initAdmin();

      expect(await minterRole.hasRole(adminRole, coinbase.address)).to.be.equal(true);
    });
  });

  describe('renounce minter account', () => {
    it('should renounce minter account 1', async () => {
      await minterRole.connect(minter).renounceMinter();

      expect(await minterRole.isMinter(minter.address)).to.be.equal(false);

      await expect(
        minterRole.connect(minter).olnyMinterFunc(),
      ).to.be.revertedWith('MinterRole: CALLER_IS_NOT_MINTER');
    });

    it('should renounce minter account 2', async () => {
      expect(await minterRole.isMinter(coinbase.address)).to.be.equal(false);

      await minterRole.connect(coinbase).renounceMinter();

      expect(await minterRole.isMinter(coinbase.address)).to.be.equal(false);

      await expect(
        minterRole.connect(coinbase).olnyMinterFunc(),
      ).to.be.revertedWith('MinterRole: CALLER_IS_NOT_MINTER');
    });

    it('should renounce minter account 3', async () => {
      expect(await minterRole.isMinter(faucet.address)).to.be.equal(false);

      await minterRole.connect(faucet).renounceMinter();

      expect(await minterRole.isMinter(faucet.address)).to.be.equal(false);

      await expect(
        minterRole.connect(faucet).olnyMinterFunc(),
      ).to.be.revertedWith('MinterRole: CALLER_IS_NOT_MINTER');
    });
  });

  describe('close minter account', () => {
    it('revert when closing by non-minter account', async () => {
      await expect(
        minterRole.connect(receiver).closeMinter(receiver.address),
      ).to.be.revertedWith('MinterRole: CALLER_IS_NOT_MINTER');
    });

    it('revert when zero account', async () => {
      await expect(
        minterRole.connect(minter).closeMinter(ZERO_ADDRESS),
      ).to.be.revertedWith('MinterRole: RECEIVER_IS_EMPTY');
    });

    it('close minter without forwarding funds', async () => {
      const initBalance = await faucet.getBalance();
      await minterRole.connect(minter).closeMinter(faucet.address, { value: 0 });

      await expect(
        minterRole.olnyMinterFunc(),
      ).to.be.revertedWith('MinterRole: CALLER_IS_NOT_MINTER');

      expect(await faucet.getBalance()).to.be.equal(initBalance);
    });

    it('close minter with forwarding funds', async () => {
      const value = 1;
      const initBalance = await faucet.getBalance();

      await minterRole.connect(minter).closeMinter(faucet.address, { value });

      await expect(
        minterRole.olnyMinterFunc(),
      ).to.be.revertedWith('MinterRole: CALLER_IS_NOT_MINTER');

      expect(await faucet.getBalance()).to.be.equal(BigNumber.from(initBalance).add(value));
    });
  });

  describe('rotate minter account', () => {
    it('revert when rotateing by non-minter account', async () => {
      await expect(
        minterRole.connect(receiver).rotateMinter(receiver.address),
      ).to.be.revertedWith('MinterRole: CALLER_IS_NOT_MINTER');
    });

    it('revert when zero account', async () => {
      await expect(
        minterRole.connect(minter).rotateMinter(ZERO_ADDRESS),
      ).to.be.revertedWith('MinterRole: RECEIVER_IS_EMPTY');
    });

    it('rotate minter without defining value', async () => {
      const initBalance = await receiver.getBalance();

      await minterRole.connect(minter).rotateMinter(receiver.address);

      await expect(
        minterRole.olnyMinterFunc(),
      ).to.be.revertedWith('MinterRole: CALLER_IS_NOT_MINTER');

      expect(await receiver.getBalance()).to.be.equal(initBalance);
    });

    it('rotate minter without forwarding funds', async () => {
      const initBalance = await receiver.getBalance();

      await minterRole.connect(minter).rotateMinter(receiver.address, { value: 0 });

      await expect(
        minterRole.olnyMinterFunc(),
      ).to.be.revertedWith('MinterRole: CALLER_IS_NOT_MINTER');

      expect(await receiver.getBalance()).to.be.equal(initBalance);
    });

    it('rotate minter with forwarding funds', async () => {
      const value = 3;
      const initBalance = await receiver.getBalance();

      await minterRole.connect(minter).rotateMinter(receiver.address, { value });

      await expect(
        minterRole.olnyMinterFunc(),
      ).to.be.revertedWith('MinterRole: CALLER_IS_NOT_MINTER');

      expect(await receiver.getBalance()).to.be.equal(BigNumber.from(initBalance).add(value));
    });
  });
});
