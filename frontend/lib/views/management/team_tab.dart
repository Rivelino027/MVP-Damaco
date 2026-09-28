import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../providers/client_provider.dart';
import '../../theme/app_colors.dart';
import '../../utils/formatters.dart';

class TeamTab extends StatefulWidget {
  const TeamTab({super.key});

  @override
  State<TeamTab> createState() => _TeamTabState();
}

class _TeamTabState extends State<TeamTab> {
  final TextEditingController _searchCtrl = TextEditingController();

  final List<Map<String, dynamic>> _team = [
    {'id': '1', 'name': 'Budi Santoso', 'role': 'OWNER', 'email': 'owner@damaco.id', 'rate': 200000.0, 'projects': 12},
    {'id': '2', 'name': 'Rina Wijaya', 'role': 'PM', 'email': 'pm@damaco.id', 'rate': 150000.0, 'projects': 5},
    {'id': '3', 'name': 'Andi Pratama', 'role': 'MEMBER (Senior Dev)', 'email': 'andi@damaco.id', 'rate': 120000.0, 'projects': 3},
    {'id': '4', 'name': 'Siti Rahma', 'role': 'MEMBER (UI/UX)', 'email': 'siti@damaco.id', 'rate': 100000.0, 'projects': 4},
    {'id': '5', 'name': 'Dewi Lestari', 'role': 'FINANCE', 'email': 'finance@damaco.id', 'rate': 90000.0, 'projects': 12},
  ];

  void _showAddMemberModal() {
    final formKey = GlobalKey<FormState>();
    final nameCtrl = TextEditingController();
    final emailCtrl = TextEditingController();
    final rateCtrl = TextEditingController();
    String roleVal = 'MEMBER';

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: AppColors.card,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) {
        return StatefulBuilder(
          builder: (ctx, setModalState) {
            return Padding(
              padding: EdgeInsets.only(
                bottom: MediaQuery.of(ctx).viewInsets.bottom + 20,
                top: 20,
                left: 20,
                right: 20,
              ),
              child: Form(
                key: formKey,
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text('Tambah Anggota Tim', style: Theme.of(ctx).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.bold)),
                        IconButton(onPressed: () => Navigator.pop(ctx), icon: const Icon(Icons.close)),
                      ],
                    ),
                    const SizedBox(height: 16),
                    TextFormField(
                      controller: nameCtrl,
                      decoration: const InputDecoration(labelText: 'Nama Lengkap *', hintText: 'mis. Ahmad Dahlan'),
                      validator: (v) => (v == null || v.trim().isEmpty) ? 'Name is required.' : null,
                    ),
                    const SizedBox(height: 12),
                    TextFormField(
                      controller: emailCtrl,
                      keyboardType: TextInputType.emailAddress,
                      decoration: const InputDecoration(labelText: 'Email *', hintText: 'ahmad@damaco.id'),
                      validator: (v) {
                        if (v == null || v.trim().isEmpty) return 'Email is required.';
                        if (!v.contains('@') || !v.contains('.')) return 'Please enter a valid email.';
                        return null;
                      },
                    ),
                    const SizedBox(height: 12),
                    DropdownButtonFormField<String>(
                      value: roleVal,
                      decoration: const InputDecoration(labelText: 'Role / Peran'),
                      items: const [
                        DropdownMenuItem(value: 'OWNER', child: Text('OWNER')),
                        DropdownMenuItem(value: 'PM', child: Text('PM')),
                        DropdownMenuItem(value: 'MEMBER', child: Text('MEMBER')),
                        DropdownMenuItem(value: 'FINANCE', child: Text('FINANCE')),
                      ],
                      onChanged: (v) {
                        if (v != null) setModalState(() => roleVal = v);
                      },
                    ),
                    const SizedBox(height: 12),
                    TextFormField(
                      controller: rateCtrl,
                      keyboardType: TextInputType.number,
                      decoration: const InputDecoration(labelText: 'Tarif / Jam (Rp) *', hintText: '100000'),
                      validator: (v) {
                        if (v == null || v.trim().isEmpty) return 'Hourly rate is required.';
                        final num = double.tryParse(v.trim());
                        if (num == null || num < 0) return 'Please enter a positive number.';
                        return null;
                      },
                    ),
                    const SizedBox(height: 20),
                    SizedBox(
                      width: double.infinity,
                      height: 48,
                      child: ElevatedButton(
                        onPressed: () {
                          if (formKey.currentState!.validate()) {
                            setState(() {
                              _team.add({
                                'id': DateTime.now().millisecondsSinceEpoch.toString(),
                                'name': nameCtrl.text.trim(),
                                'email': emailCtrl.text.trim(),
                                'role': roleVal,
                                'rate': double.parse(rateCtrl.text.trim()),
                                'projects': 0,
                              });
                            });
                            Navigator.pop(ctx);
                            ScaffoldMessenger.of(context).showSnackBar(
                              const SnackBar(content: Text('Anggota tim berhasil ditambahkan.')),
                            );
                          }
                        },
                        child: const Text('Simpan Anggota'),
                      ),
                    ),
                  ],
                ),
              ),
            );
          },
        );
      },
    );
  }

  @override
  void initState() {
    super.initState();
    Future.microtask(() {
      if (!mounted) return;
      context.read<ClientProvider>().fetchClients();
    });
  }

  void _showAddClientModal() {
    final formKey = GlobalKey<FormState>();
    final companyCtrl = TextEditingController();
    final contactCtrl = TextEditingController();
    final emailCtrl = TextEditingController();
    final phoneCtrl = TextEditingController();
    final addressCtrl = TextEditingController();
    String statusVal = 'ACTIVE';

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: AppColors.card,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) {
        return Padding(
          padding: EdgeInsets.only(
            bottom: MediaQuery.of(ctx).viewInsets.bottom + 20,
            top: 20,
            left: 20,
            right: 20,
          ),
          child: Form(
            key: formKey,
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text('Tambah Klien Baru', style: Theme.of(ctx).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.bold)),
                    IconButton(onPressed: () => Navigator.pop(ctx), icon: const Icon(Icons.close)),
                  ],
                ),
                const SizedBox(height: 16),
                TextFormField(
                  controller: companyCtrl,
                  decoration: const InputDecoration(labelText: 'Company Name *', hintText: 'PT Bank Nusantara Tbk'),
                  validator: (v) => (v == null || v.trim().isEmpty) ? 'Company name is required.' : null,
                ),
                const SizedBox(height: 12),
                TextFormField(
                  controller: contactCtrl,
                  decoration: const InputDecoration(labelText: 'Contact Person *', hintText: 'Bapak Haryanto'),
                  validator: (v) => (v == null || v.trim().isEmpty) ? 'Contact person is required.' : null,
                ),
                const SizedBox(height: 12),
                TextFormField(
                  controller: emailCtrl,
                  keyboardType: TextInputType.emailAddress,
                  decoration: const InputDecoration(labelText: 'Email Kontak *', hintText: 'corp@banknusantara.co.id'),
                  validator: (v) {
                    if (v == null || v.trim().isEmpty) return 'Email is required.';
                    if (!v.contains('@') || !v.contains('.')) return 'Please enter a valid email.';
                    return null;
                  },
                ),
                const SizedBox(height: 12),
                TextFormField(
                  controller: phoneCtrl,
                  keyboardType: TextInputType.phone,
                  decoration: const InputDecoration(labelText: 'Nomor Telepon', hintText: '021-5551234'),
                ),
                const SizedBox(height: 12),
                TextFormField(
                  controller: addressCtrl,
                  decoration: const InputDecoration(labelText: 'Alamat Kantor', hintText: 'Jl. Sudirman No. 45 Jakarta'),
                ),
                const SizedBox(height: 20),
                SizedBox(
                  width: double.infinity,
                  height: 48,
                  child: ElevatedButton(
                    onPressed: () async {
                      if (formKey.currentState!.validate()) {
                        final success = await context.read<ClientProvider>().createClient({
                          'companyName': companyCtrl.text.trim(),
                          'contactPerson': contactCtrl.text.trim(),
                          'email': emailCtrl.text.trim(),
                          'phone': phoneCtrl.text.trim(),
                          'address': addressCtrl.text.trim(),
                          'status': statusVal,
                        });
                        if (mounted) {
                          Navigator.pop(ctx);
                          if (success) {
                            ScaffoldMessenger.of(context).showSnackBar(
                              const SnackBar(content: Text('Klien berhasil ditambahkan.'), backgroundColor: AppColors.success),
                            );
                          } else {
                            ScaffoldMessenger.of(context).showSnackBar(
                              SnackBar(
                                content: Text(context.read<ClientProvider>().error ?? 'Gagal membuat klien.'),
                                backgroundColor: AppColors.danger,
                              ),
                            );
                          }
                        }
                      }
                    },
                    child: const Text('Simpan Klien'),
                  ),
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  void _showEditClientModal(ClientModel client) {
    final formKey = GlobalKey<FormState>();
    final companyCtrl = TextEditingController(text: client.companyName);
    final contactCtrl = TextEditingController(text: client.contactPerson);
    final emailCtrl = TextEditingController(text: client.email);
    final phoneCtrl = TextEditingController(text: client.phone ?? '');
    final addressCtrl = TextEditingController(text: client.address ?? '');
    String statusVal = client.status;

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: AppColors.card,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) {
        return Padding(
          padding: EdgeInsets.only(
            bottom: MediaQuery.of(ctx).viewInsets.bottom + 20,
            top: 20,
            left: 20,
            right: 20,
          ),
          child: Form(
            key: formKey,
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text('Edit Detail Klien', style: Theme.of(ctx).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.bold)),
                    IconButton(onPressed: () => Navigator.pop(ctx), icon: const Icon(Icons.close)),
                  ],
                ),
                const SizedBox(height: 16),
                TextFormField(
                  controller: companyCtrl,
                  decoration: const InputDecoration(labelText: 'Company Name *'),
                  validator: (v) => (v == null || v.trim().isEmpty) ? 'Company name is required.' : null,
                ),
                const SizedBox(height: 12),
                TextFormField(
                  controller: contactCtrl,
                  decoration: const InputDecoration(labelText: 'Contact Person *'),
                  validator: (v) => (v == null || v.trim().isEmpty) ? 'Contact person is required.' : null,
                ),
                const SizedBox(height: 12),
                TextFormField(
                  controller: emailCtrl,
                  keyboardType: TextInputType.emailAddress,
                  decoration: const InputDecoration(labelText: 'Email Kontak *'),
                  validator: (v) {
                    if (v == null || v.trim().isEmpty) return 'Email is required.';
                    if (!v.contains('@') || !v.contains('.')) return 'Please enter a valid email.';
                    return null;
                  },
                ),
                const SizedBox(height: 12),
                TextFormField(
                  controller: phoneCtrl,
                  keyboardType: TextInputType.phone,
                  decoration: const InputDecoration(labelText: 'Nomor Telepon'),
                ),
                const SizedBox(height: 12),
                TextFormField(
                  controller: addressCtrl,
                  decoration: const InputDecoration(labelText: 'Alamat Kantor'),
                ),
                const SizedBox(height: 20),
                SizedBox(
                  width: double.infinity,
                  height: 48,
                  child: ElevatedButton(
                    onPressed: () async {
                      if (formKey.currentState!.validate()) {
                        final success = await context.read<ClientProvider>().updateClient(client.id, {
                          'companyName': companyCtrl.text.trim(),
                          'contactPerson': contactCtrl.text.trim(),
                          'email': emailCtrl.text.trim(),
                          'phone': phoneCtrl.text.trim(),
                          'address': addressCtrl.text.trim(),
                          'status': statusVal,
                        });
                        if (mounted) {
                          Navigator.pop(ctx);
                          if (success) {
                            ScaffoldMessenger.of(context).showSnackBar(
                              const SnackBar(content: Text('Detail klien berhasil diperbarui.'), backgroundColor: AppColors.success),
                            );
                          } else {
                            ScaffoldMessenger.of(context).showSnackBar(
                              SnackBar(
                                content: Text(context.read<ClientProvider>().error ?? 'Gagal memperbarui klien.'),
                                backgroundColor: AppColors.danger,
                              ),
                            );
                          }
                        }
                      }
                    },
                    child: const Text('Simpan Perubahan'),
                  ),
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  void _confirmDeleteMember(Map<String, dynamic> member) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Hapus Anggota Tim'),
        content: Text('Are you sure you want to delete "${member['name']}"?'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: AppColors.danger),
            onPressed: () {
              setState(() {
                _team.removeWhere((m) => m['id'] == member['id']);
              });
              Navigator.pop(ctx);
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(content: Text('Anggota tim berhasil dihapus.')),
              );
            },
            child: const Text('Delete'),
          ),
        ],
      ),
    );
  }

  void _confirmDeleteClient(ClientModel client) {
    // Protection check before dialog
    if (client.projects.isNotEmpty) {
      showDialog(
        context: context,
        builder: (ctx) => AlertDialog(
          title: const Row(
            children: [
              Icon(Icons.warning_amber_rounded, color: AppColors.danger),
              SizedBox(width: 8),
              Text('Hapus Klien Ditolak'),
            ],
          ),
          content: Text('This client cannot be deleted because it is associated with ${client.projects.length} existing project(s).'),
          actions: [
            ElevatedButton(
              onPressed: () => Navigator.pop(ctx),
              child: const Text('Mengerti'),
            ),
          ],
        ),
      );
      return;
    }

    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Hapus Klien'),
        content: Text('Are you sure you want to delete client "${client.companyName}"?'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: AppColors.danger),
            onPressed: () async {
              Navigator.pop(ctx);
              final success = await context.read<ClientProvider>().deleteClient(client.id);
              if (mounted) {
                if (success) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text('Klien berhasil dihapus.'), backgroundColor: AppColors.success),
                  );
                } else {
                  final err = context.read<ClientProvider>().error ?? 'Gagal menghapus klien.';
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(
                      content: Text(err.contains('CLIENT_HAS_PROJECTS') ? 'This client cannot be deleted because it is associated with existing projects.' : err),
                      backgroundColor: AppColors.danger,
                    ),
                  );
                }
              }
            },
            child: const Text('Delete'),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final clientProvider = context.watch<ClientProvider>();
    final allClients = clientProvider.clients;

    final query = _searchCtrl.text.trim().toLowerCase();

    final filteredTeam = _team.where((m) {
      final name = m['name'].toString().toLowerCase();
      final role = m['role'].toString().toLowerCase();
      final email = m['email'].toString().toLowerCase();
      return name.contains(query) || role.contains(query) || email.contains(query);
    }).toList();

    final filteredClients = allClients.where((c) {
      final company = c.companyName.toLowerCase();
      final contact = c.contactPerson.toLowerCase();
      final email = c.email.toLowerCase();
      return company.contains(query) || contact.contains(query) || email.contains(query);
    }).toList();

    return Scaffold(
      body: ListView(
        padding: const EdgeInsets.all(24),
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('Team & Client Management', style: Theme.of(context).textTheme.titleLarge),
                    const SizedBox(height: 4),
                    const Text('Kelola alokasi anggota tim, tarif labor per jam, dan daftar klien agensi', style: TextStyle(color: AppColors.textSecondary, fontSize: 13)),
                  ],
                ),
              ),
              const SizedBox(width: 12),
              Wrap(
                spacing: 8,
                children: [
                  OutlinedButton.icon(
                    onPressed: _showAddClientModal,
                    icon: const Icon(Icons.business_outlined, size: 16),
                    label: const Text('Add Client'),
                  ),
                  ElevatedButton.icon(
                    onPressed: _showAddMemberModal,
                    icon: const Icon(Icons.person_add, size: 16),
                    label: const Text('Add Member'),
                  ),
                ],
              ),
            ],
          ),
          const SizedBox(height: 16),

          // Search Bar
          TextField(
            controller: _searchCtrl,
            onChanged: (v) => setState(() {}),
            decoration: InputDecoration(
              hintText: 'Cari tim atau klien...',
              prefixIcon: const Icon(Icons.search, size: 20),
              suffixIcon: _searchCtrl.text.isNotEmpty
                  ? IconButton(
                      icon: const Icon(Icons.clear, size: 18),
                      onPressed: () => setState(() => _searchCtrl.clear()),
                    )
                  : null,
            ),
          ),
          const SizedBox(height: 20),

          // Team Members Section
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text('Team Members & Hourly Rates', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: AppColors.textPrimary)),
              Text('${filteredTeam.length} members', style: const TextStyle(fontSize: 12, color: AppColors.textMuted)),
            ],
          ),
          const SizedBox(height: 12),
          if (filteredTeam.isEmpty)
            Container(
              padding: const EdgeInsets.all(24),
              alignment: Alignment.center,
              decoration: BoxDecoration(
                color: AppColors.card,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: AppColors.border),
              ),
              child: const Text('Tidak ada anggota tim yang cocok.', style: TextStyle(color: AppColors.textMuted)),
            )
          else
            Container(
              decoration: BoxDecoration(
                color: AppColors.card,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: AppColors.border),
              ),
              child: Column(
                children: filteredTeam.map((m) {
                  return Container(
                    padding: const EdgeInsets.all(14),
                    decoration: const BoxDecoration(
                      border: Border(bottom: BorderSide(color: AppColors.borderSubtle)),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            CircleAvatar(
                              radius: 18,
                              backgroundColor: AppColors.primaryLight,
                              child: Text(m['name'][0], style: const TextStyle(fontWeight: FontWeight.bold, color: AppColors.primary)),
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(m['name'], style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                                  Text(m['email'], style: const TextStyle(fontSize: 12, color: AppColors.textMuted)),
                                ],
                              ),
                            ),
                            IconButton(
                              icon: const Icon(Icons.delete_outline, size: 18, color: AppColors.danger),
                              onPressed: () => _confirmDeleteMember(m),
                              tooltip: 'Hapus Anggota',
                            ),
                          ],
                        ),
                        const SizedBox(height: 8),
                        Wrap(
                          alignment: WrapAlignment.spaceBetween,
                          crossAxisAlignment: WrapCrossAlignment.center,
                          spacing: 8,
                          runSpacing: 6,
                          children: [
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                              decoration: BoxDecoration(color: AppColors.primaryLight, borderRadius: BorderRadius.circular(6)),
                              child: Text(m['role'], style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: AppColors.primary)),
                            ),
                            Text('Rate: ${Formatters.rupiah((m['rate'] as num).toDouble())}/jam', style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: AppColors.success)),
                          ],
                        ),
                      ],
                    ),
                  );
                }).toList(),
              ),
            ),
          const SizedBox(height: 24),

          // Clients Section
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text('Clients & Accounts', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: AppColors.textPrimary)),
              Text('${filteredClients.length} clients', style: const TextStyle(fontSize: 12, color: AppColors.textMuted)),
            ],
          ),
          const SizedBox(height: 12),
          if (filteredClients.isEmpty)
            Container(
              padding: const EdgeInsets.all(24),
              alignment: Alignment.center,
              decoration: BoxDecoration(
                color: AppColors.card,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: AppColors.border),
              ),
              child: const Text('Tidak ada klien yang cocok.', style: TextStyle(color: AppColors.textMuted)),
            )
          else
            LayoutBuilder(
              builder: (context, constraints) {
                return Column(
                  children: filteredClients.map((c) {
                    return Container(
                      margin: const EdgeInsets.only(bottom: 12),
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: AppColors.card,
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: AppColors.border),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Expanded(child: Text(c.companyName, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15))),
                              Row(
                                children: [
                                  IconButton(
                                    icon: const Icon(Icons.edit_outlined, size: 18, color: AppColors.primary),
                                    onPressed: () => _showEditClientModal(c),
                                    tooltip: 'Edit Klien',
                                  ),
                                  IconButton(
                                    icon: const Icon(Icons.delete_outline, size: 18, color: AppColors.danger),
                                    onPressed: () => _confirmDeleteClient(c),
                                    tooltip: 'Hapus Klien',
                                  ),
                                ],
                              ),
                            ],
                          ),
                          const SizedBox(height: 4),
                          Text('Contact: ${c.contactPerson}', style: const TextStyle(fontSize: 12, color: AppColors.textMuted)),
                          Text('Email: ${c.email}', style: const TextStyle(fontSize: 12, color: AppColors.textSecondary)),
                          if (c.phone != null && c.phone!.isNotEmpty) Text('Phone: ${c.phone}', style: const TextStyle(fontSize: 12, color: AppColors.textMuted)),
                          const SizedBox(height: 14),
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Text('${c.projects.length} Associated Projects', style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: AppColors.primary)),
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                                decoration: BoxDecoration(color: c.status == 'ACTIVE' ? AppColors.successBg : AppColors.borderSubtle, borderRadius: BorderRadius.circular(4)),
                                child: Text(c.status, style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: c.status == 'ACTIVE' ? AppColors.success : AppColors.textMuted)),
                              ),
                            ],
                          ),
                        ],
                      ),
                    );
                  }).toList(),
                );
              },
            ),
        ],
      ),
    );
  }
}
